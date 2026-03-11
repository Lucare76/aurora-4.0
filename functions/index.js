/**
 * Birthday reminder scheduler (email) con Resend.
 *
 * - Runs daily at 09:00 Europe/Rome
 * - Finds birthdays happening in 2 days (configurable per user)
 * - Sends ONE email per user with the list
 * - Prevents duplicate sends with lastReminderYear
 *
 * Firestore expected:
 *
 * users/{uid}
 *  - reminderEmail: string
 *  - reminderDaysBefore?: number (default 2)
 *
 * birthdays/{docId}
 *  - userId: string
 *  - name: string
 *  - date: "DD/MM" OR birthDate: "YYYY-MM-DD"  (month/day used)
 *  - lastReminderYear?: number (optional, to prevent duplicates)
 */

const admin = require("firebase-admin");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onRequest, onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const {extractReceiptTime} = require("./receiptTimeExtractor");
let ResendLib;
let DateTimeLib;

function getResendLib() {
  if (!ResendLib) {
    ({Resend: ResendLib} = require("resend"));
  }
  return ResendLib;
}

function getDateTime() {
  if (!DateTimeLib) {
    ({DateTime: DateTimeLib} = require("luxon"));
  }
  return DateTimeLib;
}

// Inizializza Firebase Admin in modo lazy per evitare timeouts in fase di deploy
let db;
function getDb() {
  if (!db) {
    admin.initializeApp();
    db = admin.firestore();
  }
  return db;
}

// Definisci i secrets
const resendApiKey = defineSecret("RESEND_API_KEY");
const visionApiKey = defineSecret("GOOGLE_VISION_API_KEY");
const ADMIN_EMAIL = "luca_renna@hotmail.com";

/**
 * Returns a Resend client instance
 * @return {Resend} resend client
 */
function getResendClient() {
  const apiKey = resendApiKey.value();

  if (!apiKey) {
    throw new Error(
        "Missing RESEND_API_KEY secret. Check Secret Manager.",
    );
  }

  const Resend = getResendLib();
  return new Resend(apiKey);
}

/**
 * Send an email with Resend.
 * @param {{to: string, subject: string, text: string, html?: string}} payload
 * @return {Promise<import("resend").CreateEmailResponse>}
 */
async function sendEmail(payload) {
  const resend = getResendClient();

  const response = await resend.emails.send({
    from: "Aurora 4.0 <onboarding@resend.dev>",
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });

  if (response?.error) {
    const providerMessage =
      response.error.message || response.error.name || "Unknown email provider error";
    throw new Error(`Resend error: ${providerMessage}`);
  }

  const emailId = response?.data?.id || response?.id || null;
  if (!emailId) {
    throw new Error("Resend did not return an email id");
  }

  return {...response, id: emailId};
}

/**
 * Escape HTML special chars in dynamic email content.
 * @param {unknown} value
 * @return {string}
 */
function escapeHtml(value) {
  return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
}

/**
 * Checks if the caller is authenticated and (optionally) admin.
 * @param {import("firebase-functions/v2/https").CallableRequest} request
 * @param {boolean} requireAdmin
 */
async function assertAuth(request, requireAdmin = false) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Unauthorized");
  }

  if (!requireAdmin) return;

  const userSnap = await getDb().collection("users").doc(request.auth.uid).get();
  if (!userSnap.exists) {
    throw new HttpsError("not-found", "User not found");
  }
  const role = userSnap.data()?.role;
  if (role !== "admin") {
    throw new HttpsError("permission-denied", "Forbidden");
  }
}

/**
 * Compute next birthday date (this year or next) in Europe/Rome.
 * Supporta sia formato "YYYY-MM-DD" che "DD/MM".
 * Handles Feb 29 -> Feb 28 for non-leap years.
 *
 * @param {string} dateStr - "YYYY-MM-DD" oppure "DD/MM"
 * @param {DateTime} nowRome - Luxon DateTime in Europe/Rome
 * @return {DateTime|null} Next birthday date or null if invalid input
 */
function getNextBirthdayDate(dateStr, nowRome) {
  const DateTime = getDateTime();
  if (!dateStr) return null;

  let day, month;

  // Controlla se è formato "DD/MM" (es: "11/02")
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    if (parts.length !== 2) return null;
    
    day = Number(parts[0]);
    month = Number(parts[1]);
  } else {
    // Formato "YYYY-MM-DD"
    const parts = dateStr.split("-");
    if (parts.length !== 3) return null;
    
    month = Number(parts[1]);
    day = Number(parts[2]);
  }

  if (!month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  let bday = DateTime.fromObject(
      {
        year: nowRome.year,
        month,
        day,
        hour: 0,
        minute: 0,
        second: 0,
      },
      {zone: "Europe/Rome"},
  );

  // Feb 29 -> Feb 28 on non-leap years
  if (!bday.isValid) {
    bday = DateTime.fromObject(
        {
          year: nowRome.year,
          month: 2,
          day: 28,
          hour: 0,
          minute: 0,
          second: 0,
        },
        {zone: "Europe/Rome"},
    );
  }

  // Se il compleanno è già passato quest'anno, prendi l'anno prossimo
  if (bday < nowRome.startOf("day")) {
    let next = bday.plus({years: 1});

    if (!next.isValid) {
      next = DateTime.fromObject(
          {
            year: nowRome.year + 1,
            month: 2,
            day: 28,
            hour: 0,
            minute: 0,
            second: 0,
          },
          {zone: "Europe/Rome"},
      );
    }

    return next;
  }

  return bday;
}

/**
 * Build email content with professional HTML template.
 * @param {number} daysBefore - reminder offset days
 * @param {Array<{name: string, iso: string, dateLabel: string}>} items
 * @param {string} userName - nome dell'utente destinatario (opzionale)
 * @return {{subject: string, text: string, html: string}}
 */
function buildEmail(daysBefore, items, userName = "") {
  const subject = `Promemoria compleanni tra ${daysBefore} giorni 🎂`;

  const sorted = [...items].sort((a, b) => a.iso.localeCompare(b.iso));
  const listText = sorted.map((x) => `• ${x.name} – ${x.dateLabel}`).join("\n");

  // Se ci sono più compleanni, mostriamo una lista
  let birthdayNames = sorted.map(x => x.name).join(", ");
  if (sorted.length > 1) {
    const lastIndex = birthdayNames.lastIndexOf(", ");
    birthdayNames = birthdayNames.substring(0, lastIndex) + " e " + birthdayNames.substring(lastIndex + 2);
  }

  // Per il template HTML, se ci sono più compleanni creiamo una lista
  const birthdayListHtml = sorted.length === 1 
    ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:25px 0; background:#f9fafb; border-radius:10px; border:1px solid #e5e7eb;">
        <tr>
          <td style="padding:20px; text-align:center;">
            <p style="margin:0; font-size:14px; color:#6b7280;">
              📅 Data del compleanno
            </p>
            <p style="margin:8px 0 0; font-size:20px; font-weight:bold; color:#111827;">
              ${sorted[0].dateLabel}
            </p>
          </td>
        </tr>
      </table>
    `
    : `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:25px 0; background:#f9fafb; border-radius:10px; border:1px solid #e5e7eb;">
        <tr>
          <td style="padding:20px;">
            <p style="margin:0 0 15px; font-size:14px; color:#6b7280; text-align:center;">
              📅 Compleanni in arrivo
            </p>
            ${sorted.map(item => `
              <div style="padding:12px; margin-bottom:10px; background:#ffffff; border-radius:8px; border-left:4px solid #8b5cf6;">
                <p style="margin:0; font-size:16px; font-weight:bold; color:#111827;">
                  ${item.name}
                </p>
                <p style="margin:5px 0 0; font-size:14px; color:#6b7280;">
                  ${item.dateLabel}
                </p>
              </div>
            `).join("")}
          </td>
        </tr>
      </table>
    `;

  const text =
    `Ciao${userName ? " " + userName : ""},\n\n` +
    `ti ricordiamo che tra ${daysBefore} giorni sarà il compleanno di:\n\n` +
    `${listText}\n\n` +
    "Non dimenticare di fare gli auguri!\n\n" +
    "A presto,\nAurora 4.0";

  const html = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Promemoria Compleanno</title>
</head>
<body style="margin:0; padding:0; background-color:#f3f4f6; font-family: Arial, Helvetica, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6; padding:40px 0;">
    <tr>
      <td align="center">
        <!-- CONTAINER -->
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.1); max-width:600px;">
          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6); padding:30px; text-align:center; color:#ffffff;">
              <h1 style="margin:0; font-size:26px;">🎂 Promemoria Compleanno</h1>
              <p style="margin:8px 0 0; font-size:14px; opacity:0.9;">
                Mancano solo ${daysBefore} ${daysBefore === 1 ? "giorno" : "giorni"}!
              </p>
            </td>
          </tr>
          <!-- BODY -->
          <tr>
            <td style="padding:30px; color:#374151; font-size:15px; line-height:1.6;">
              <p style="margin-top:0;">
                Ciao${userName ? " <strong>" + userName + "</strong>" : ""} 👋
              </p>
              <p>
                Questo è un promemoria importante:  
                ${sorted.length === 1 
                  ? `il compleanno di <strong>${sorted[0].name}</strong> è proprio dietro l'angolo! 🎉`
                  : `ci sono <strong>${sorted.length} compleanni</strong> in arrivo! 🎉`
                }
              </p>
              <!-- INFO BOX -->
              ${birthdayListHtml}
              <p>
                Non dimenticare di fare gli auguri 🎁  
                Un piccolo gesto può fare una grande differenza ✨
              </p>
              <p style="margin-bottom:0;">
                A presto!
              </p>
            </td>
          </tr>
          <!-- FOOTER -->
          <tr>
            <td style="background:#f9fafb; padding:20px; text-align:center; font-size:12px; color:#6b7280;">
              <strong>Aurora 4.0</strong><br>
              Il tuo assistente finanziario 💜
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return {subject, text, html};
}

/**
 * Build a direct birthday greeting email for the celebrant.
 * @param {{
 *   birthdayName: string,
 *   senderName?: string,
 *   customMessage?: string
 * }} payload
 * @return {{subject: string, text: string, html: string}}
 */
function buildBirthdayGreetingEmail(payload) {
  const rawBirthdayName = String(payload?.birthdayName || "Festeggiato");
  const rawSenderName = String(payload?.senderName || "Una persona speciale");
  const birthdayName = escapeHtml(rawBirthdayName);
  const senderName = escapeHtml(rawSenderName);
  const customMessage = String(payload?.customMessage || "").trim();
  const safeCustomMessage = escapeHtml(customMessage);

  const subject = `Tanti auguri, ${rawBirthdayName}!`;
  const preheader = "Un pensiero speciale per il tuo compleanno.";
  const messageText = customMessage ||
    `${rawSenderName} ti manda un pensiero speciale e ti augura ` +
    "una giornata piena di gioia, serenita e belle sorprese.";

  const text =
    `Buon compleanno, ${rawBirthdayName}!\n\n` +
    `${messageText}\n\n` +
    "Che questo compleanno porti con se momenti felici, " +
    "affetto sincero e tutto cio che desideri di piu.\n\n" +
    `Con affetto,\n${rawSenderName}`;

  const customMessageHtml = safeCustomMessage ?
    `<p style="margin:0 0 16px; font-size:16px; line-height:1.7; color:#374151;">
      ${safeCustomMessage}
    </p>` :
    "";

  const html = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tanti auguri, ${birthdayName}!</title>
</head>
<body style="margin:0; padding:0; background:#f7f3ee; font-family: Georgia, 'Times New Roman', serif; color:#1f2937;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
    ${preheader}
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ee; padding:32px 12px;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="width:100%; max-width:620px; background:#fffdf9; border:1px solid #eadfce; border-radius:20px; overflow:hidden;">
          <tr>
            <td style="padding:18px 24px; background:linear-gradient(135deg,#f4d7a1,#e88f6a); text-align:center; color:#fffaf3;">
              <div style="font-size:12px; letter-spacing:0.24em; text-transform:uppercase; opacity:0.92;">
                Aurora 4.0
              </div>
              <h1 style="margin:14px 0 8px; font-size:34px; line-height:1.2; font-weight:normal;">
                Buon compleanno, ${birthdayName}!
              </h1>
              <p style="margin:0; font-size:15px; line-height:1.5; opacity:0.95;">
                Un pensiero speciale per il tuo giorno.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:34px 30px 20px;">
              <p style="margin:0 0 16px; font-size:18px; line-height:1.7; color:#7c4a32;">
                Oggi e un giorno speciale.
              </p>
              <p style="margin:0 0 16px; font-size:16px; line-height:1.7; color:#374151;">
                <strong>${senderName}</strong> ti manda un pensiero di auguri
                e ti augura una giornata piena di gioia, serenita e belle sorprese.
              </p>
              ${customMessageHtml}
              <div style="margin:24px 0; padding:18px 20px; background:#fff7ed; border-left:4px solid #e88f6a; border-radius:12px;">
                <p style="margin:0; font-size:15px; line-height:1.7; color:#5b3a29;">
                  Che questo compleanno porti con se momenti felici, affetto sincero
                  e tutto cio che desideri di piu.
                </p>
              </div>
              <p style="margin:0; font-size:16px; line-height:1.7; color:#374151;">
                Con affetto,<br>
                <strong>${senderName}</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 24px 24px; text-align:center; background:#fffaf3; font-family: Arial, Helvetica, sans-serif; font-size:12px; color:#8b735f;">
              Messaggio inviato tramite Aurora 4.0
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return {subject, text, html};
}

/**
 * Scheduled function che gira ogni giorno alle 09:00 Europe/Rome.
 * Cerca i compleanni che avverranno tra 2 giorni e invia reminder via email.
 */
exports.birthdayReminderDaily = onSchedule(
    {
      schedule: "0 9 * * *",
      timeZone: "Europe/Rome",
      secrets: [resendApiKey],
      memory: "256MiB",
      timeoutSeconds: 540,
      region: "europe-west1",
    },
    async () => {
      console.log("Starting birthday reminder job...");

      const DateTime = getDateTime();
      const nowRome = DateTime.now().setZone("Europe/Rome");
      const defaultDaysBefore = 2;
      const target = nowRome.plus({days: defaultDaysBefore}).startOf("day");

      console.log(`Looking for birthdays on: ${target.toISODate()}`);

      let resend;
      try {
        resend = getResendClient();
      } catch (error) {
        console.error("Failed to create Resend client:", error);
        throw error;
      }

      // Leggi tutti i compleanni
      let snap;
      try {
        snap = await getDb().collection("birthdays").get();
        console.log(`Found ${snap.size} birthday documents`);
      } catch (error) {
        console.error("Failed to fetch birthdays:", error);
        throw error;
      }

      /**
       * byUser map:
       * userId -> {docsToUpdate: Array<{ref, yearToMark}>, items: Array<...>}
       */
      const byUser = new Map();

      snap.forEach((doc) => {
        const d = doc.data() || {};
        if (!d.userId || !d.name) {
          console.log(`Skipping invalid birthday doc: ${doc.id}`);
          return;
        }

        // Supporta sia "birthDate" che "date"
        const dateStr = d.birthDate || d.date;
        if (!dateStr) {
          console.log(`Skipping birthday without date: ${doc.id}`);
          return;
        }

        const next = getNextBirthdayDate(dateStr, nowRome);
        if (!next) {
          console.log(`Could not compute next birthday for: ${d.name}`);
          return;
        }

        // Trova solo i compleanni che cadono esattamente tra 2 giorni
        if (next.toISODate() !== target.toISODate()) {
          return;
        }

        const yearToMark = next.year;

        // Previeni invii duplicati nello stesso anno
        if (d.lastReminderYear === yearToMark) {
          console.log(
              `Already sent reminder for ${d.name} in year ${yearToMark}`,
          );
          return;
        }

        const dateLabel = next.setLocale("it").toFormat("dd LLLL");

        if (!byUser.has(d.userId)) {
          byUser.set(d.userId, {docsToUpdate: [], items: []});
        }

        const entry = byUser.get(d.userId);
        entry.docsToUpdate.push({ref: doc.ref, yearToMark});
        entry.items.push({
          name: d.name,
          iso: next.toISODate(),
          dateLabel,
        });
      });

      if (byUser.size === 0) {
        console.log("No birthday reminders to send today.");
        return;
      }

      console.log(`Preparing to send reminders to ${byUser.size} users`);

      // Invia email per ogni utente
      let successCount = 0;
      let errorCount = 0;

      for (const [userId, payload] of byUser.entries()) {
        try {
          const userSnap = await getDb().collection("users").doc(userId).get();
          if (!userSnap.exists) {
            console.log(`User ${userId} not found, skipping.`);
            continue;
          }

          const userData = userSnap.data() || {};
          const toEmail = userData.reminderEmail;
          const daysBefore = Number(
              userData.reminderDaysBefore || defaultDaysBefore,
          );

          if (!toEmail) {
            console.log(`User ${userId} missing reminderEmail, skipping.`);
            continue;
          }

          // Costruisci email
          const email = buildEmail(daysBefore, payload.items);

          // Invia email con Resend
          await resend.emails.send({
            from: "Promemoria Compleanni <onboarding@resend.dev>",
            to: toEmail,
            subject: email.subject,
            text: email.text,
            html: email.html,
          });

          // Aggiorna i documenti birthday con lastReminderYear
          const batch = getDb().batch();
          payload.docsToUpdate.forEach((x) => {
            batch.update(x.ref, {lastReminderYear: x.yearToMark});
          });
          await batch.commit();

          console.log(
              `✓ Reminder sent to ${toEmail} for user ${userId} ` +
              `(${payload.items.length} birthdays)`,
          );
          successCount++;
        } catch (error) {
          console.error(`✗ Failed to send reminder to user ${userId}:`, error);
          errorCount++;
        }
      }

      console.log(
          `Birthday reminder job completed. Success: ${successCount}, ` +
          `Errors: ${errorCount}`,
      );
    },
);

/**
 * Funzione HTTP di test per verificare l'invio email con Resend.
 */
exports.testBirthdayEmail = onRequest(
    {
      secrets: [resendApiKey],
      region: "europe-west1",
      memory: "256MiB",
      timeoutSeconds: 60,
    },
    async (req, res) => {
      try {
        console.log("Testing Resend email configuration...");

        const resend = getResendClient();

        // Prende l'email dal query param ?email=... oppure usa un default
        const toEmail = req.query.email || "luca_renna@hotmail.com";

        console.log(`Sending test email to: ${toEmail}`);

        // Invia email di test
        const data = await resend.emails.send({
          from: "Promemoria Compleanni Test <onboarding@resend.dev>",
          to: toEmail,
          subject: "🎂 Test Resend - Promemoria Compleanni",
          text: "Questa è una email di test da Firebase Functions con Resend!\n\n" +
                "Se ricevi questa email, la configurazione funziona correttamente.",
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
              <h2 style="color: #4CAF50;">✅ Test Email Resend</h2>
              <p>Questa è una <strong>email di test</strong> da Firebase Functions con Resend!</p>
              <p>Se ricevi questa email, la configurazione funziona correttamente. 🎉</p>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
              <p style="color: #666; font-size: 12px;">
                <strong>Dettagli tecnici:</strong><br>
                Destinatario: ${toEmail}<br>
                Timestamp: ${new Date().toISOString()}
              </p>
            </div>
          `,
        });

        console.log("Email sent successfully:", data.id);

        res.status(200).json({
          success: true,
          message: "✅ Email di test inviata con successo!",
          emailId: data.id,
          to: toEmail,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error sending test email:", error);
        res.status(500).json({
          success: false,
          error: error.message,
          details: error.toString(),
        });
      }
    },
);

/**
 * Funzione HTTP di test manuale per il reminder compleanni.
 * Esegue immediatamente la logica del reminder senza aspettare lo scheduler.
 * 
 * URL: https://[region]-[project].cloudfunctions.net/testBirthdayReminder?daysAhead=2
 */
exports.testBirthdayReminder = onRequest(
    {
      secrets: [resendApiKey],
      region: "europe-west1",
      memory: "256MiB",
      timeoutSeconds: 120,
    },
    async (req, res) => {
      try {
        console.log("🧪 Starting MANUAL birthday reminder test...");

        const DateTime = getDateTime();
        const nowRome = DateTime.now().setZone("Europe/Rome");
        
        // Permette di testare con diversi giorni (default 2)
        const daysAhead = parseInt(req.query.daysAhead) || 2;
        const target = nowRome.plus({days: daysAhead}).startOf("day");

        console.log(`📅 Current date: ${nowRome.toISODate()}`);
        console.log(`🎯 Looking for birthdays on: ${target.toISODate()} (in ${daysAhead} days)`);

        let resend;
        try {
          resend = getResendClient();
        } catch (error) {
          console.error("Failed to create Resend client:", error);
          throw error;
        }

        // Leggi tutti i compleanni
        const snap = await getDb().collection("birthdays").get();
        console.log(`📚 Found ${snap.size} birthday documents total`);

        const byUser = new Map();
        let matchedCount = 0;

        snap.forEach((doc) => {
          const d = doc.data() || {};
          
          if (!d.userId || !d.name) {
            console.log(`⚠️ Skipping invalid birthday doc: ${doc.id}`);
            return;
          }

          // Supporta sia "birthDate" che "date"
          const dateStr = d.birthDate || d.date;
          if (!dateStr) {
            console.log(`⚠️ Skipping birthday without date: ${doc.id}`);
            return;
          }

          const next = getNextBirthdayDate(dateStr, nowRome);
          if (!next) {
            console.log(`⚠️ Could not compute next birthday for: ${d.name}`);
            return;
          }

          console.log(`👤 ${d.name}: next birthday is ${next.toISODate()}`);

          // Trova i compleanni che cadono nel giorno target
          if (next.toISODate() === target.toISODate()) {
            matchedCount++;
            console.log(`✅ MATCH! ${d.name} has birthday on ${target.toISODate()}`);

            const yearToMark = next.year;
            const dateLabel = next.setLocale("it").toFormat("dd LLLL");

            if (!byUser.has(d.userId)) {
              byUser.set(d.userId, {docsToUpdate: [], items: []});
            }

            const entry = byUser.get(d.userId);
            entry.docsToUpdate.push({ref: doc.ref, yearToMark});
            entry.items.push({
              name: d.name,
              iso: next.toISODate(),
              dateLabel,
            });
          }
        });

        console.log(`🎯 Found ${matchedCount} birthdays matching ${target.toISODate()}`);

        if (byUser.size === 0) {
          return res.status(200).json({
            success: true,
            message: "No birthday reminders to send today.",
            targetDate: target.toISODate(),
            daysAhead: daysAhead,
            totalBirthdays: snap.size,
            matchedBirthdays: 0,
          });
        }

        console.log(`📧 Preparing to send reminders to ${byUser.size} users`);

        // Invia email per ogni utente
        const results = [];
        let successCount = 0;
        let errorCount = 0;

        for (const [userId, payload] of byUser.entries()) {
          try {
            const userSnap = await getDb().collection("users").doc(userId).get();
            
            if (!userSnap.exists) {
              console.log(`⚠️ User ${userId} not found, skipping.`);
              results.push({
                userId,
                success: false,
                error: "User not found",
              });
              errorCount++;
              continue;
            }

            const userData = userSnap.data() || {};
            const toEmail = userData.reminderEmail;
            const daysBefore = Number(userData.reminderDaysBefore || daysAhead);

            if (!toEmail) {
              console.log(`⚠️ User ${userId} missing reminderEmail, skipping.`);
              results.push({
                userId,
                success: false,
                error: "Missing reminderEmail",
              });
              errorCount++;
              continue;
            }

            console.log(`📧 Sending to ${toEmail} for user ${userId}`);

            // Costruisci email
            const email = buildEmail(daysBefore, payload.items);

            // Invia email con Resend
            const emailData = await resend.emails.send({
              from: "Promemoria Compleanni <onboarding@resend.dev>",
              to: toEmail,
              subject: email.subject,
              text: email.text,
              html: email.html,
            });

            console.log(`✅ Email sent to ${toEmail} (ID: ${emailData.id})`);

            results.push({
              userId,
              email: toEmail,
              birthdaysCount: payload.items.length,
              birthdays: payload.items.map(b => b.name),
              emailId: emailData.id,
              success: true,
            });

            successCount++;
          } catch (error) {
            console.error(`❌ Failed to send reminder to user ${userId}:`, error);
            results.push({
              userId,
              success: false,
              error: error.message,
            });
            errorCount++;
          }
        }

        console.log(`✅ Test completed. Success: ${successCount}, Errors: ${errorCount}`);

        res.status(200).json({
          success: true,
          message: `Birthday reminder test completed`,
          targetDate: target.toISODate(),
          daysAhead: daysAhead,
          totalBirthdays: snap.size,
          matchedBirthdays: matchedCount,
          emailsSent: successCount,
          emailsFailed: errorCount,
          results: results,
        });
      } catch (error) {
        console.error("❌ Test birthday reminder error:", error);
        res.status(500).json({
          success: false,
          error: error.message,
          details: error.toString(),
        });
      }
    },
);

/**
 * Callable: invia reminder compleanno singolo (frontend).
 */
exports.sendBirthdayReminderBrevo = onCall(
    {
      secrets: [resendApiKey],
      region: "europe-west1",
      memory: "256MiB",
      timeoutSeconds: 30,
    },
    async (request) => {
      await assertAuth(request);

      const {
        toEmail,
        userName = "Utente",
        birthdayName,
        birthdayDate,
        daysUntil,
      } = request.data || {};

      if (!toEmail || !birthdayName || !birthdayDate) {
        throw new HttpsError("invalid-argument", "Missing required fields");
      }

      const subject = daysUntil != null
        ? `Promemoria compleanno tra ${daysUntil} giorni 🎂`
        : "Promemoria compleanno 🎂";

      const text =
        `Ciao ${userName},\n\n` +
        `ti ricordiamo che il compleanno di ${birthdayName} è il ${birthdayDate}.\n` +
        (daysUntil != null ? `Mancano ${daysUntil} giorni.\n\n` : "\n") +
        "Non dimenticare di fare gli auguri!\n\n" +
        "A presto,\nAurora 4.0";

      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
          <h2 style="color: #8b5cf6;">🎂 Promemoria Compleanno</h2>
          <p>Ciao <strong>${userName}</strong>,</p>
          <p>Ti ricordiamo che il compleanno di <strong>${birthdayName}</strong> è il <strong>${birthdayDate}</strong>.</p>
          ${daysUntil != null ? `<p>Mancano <strong>${daysUntil}</strong> giorni.</p>` : ""}
          <p>Non dimenticare di fare gli auguri!</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">Aurora 4.0</p>
        </div>
      `;

      const data = await sendEmail({to: toEmail, subject, text, html});

      return {success: true, emailId: data?.id || null};
  },
);

/**
 * Callable: invia auguri di compleanno diretti al festeggiato.
 */
exports.sendBirthdayGreetingBrevo = onCall(
    {
      secrets: [resendApiKey],
      region: "europe-west1",
      memory: "256MiB",
      timeoutSeconds: 30,
    },
    async (request) => {
      await assertAuth(request);

      const {
        toEmail,
        birthdayName,
        senderName = "Una persona speciale",
        customMessage = "",
      } = request.data || {};

      if (!toEmail || !birthdayName) {
        throw new HttpsError("invalid-argument", "Missing required fields");
      }

      const email = buildBirthdayGreetingEmail({
        birthdayName,
        senderName,
        customMessage,
      });

      const data = await sendEmail({
        to: toEmail,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });

      console.log(`✅ Birthday greeting email accepted for ${toEmail} (${data.id})`);

      return {success: true, emailId: data?.id || null};
    },
);

/**
 * Callable: invia email di test (frontend).
 */
exports.sendTestEmailBrevo = onCall(
    {
      secrets: [resendApiKey],
      region: "europe-west1",
      memory: "256MiB",
      timeoutSeconds: 30,
    },
    async (request) => {
      await assertAuth(request);

      const {toEmail, userName = "Utente"} = request.data || {};
      if (!toEmail) {
        throw new HttpsError("invalid-argument", "Missing toEmail");
      }

      const subject = "✅ Test Email Aurora 4.0";
      const text =
        `Ciao ${userName},\n\n` +
        "Questa è una email di test da Aurora 4.0.\n\n" +
        "Se la ricevi, la configurazione funziona correttamente.\n\n" +
        "A presto,\nAurora 4.0";

      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
          <h2 style="color: #22c55e;">✅ Test Email Aurora 4.0</h2>
          <p>Ciao <strong>${userName}</strong>,</p>
          <p>Questa è una email di test da Aurora 4.0.</p>
          <p>Se la ricevi, la configurazione funziona correttamente.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">Aurora 4.0</p>
        </div>
      `;

      const data = await sendEmail({to: toEmail, subject, text, html});
      return {success: true, emailId: data?.id || null};
    },
);

/**
 * Callable: notifica admin nuovo utente.
 */
exports.sendNewUserNotification = onCall(
    {
      secrets: [resendApiKey],
      region: "europe-west1",
      memory: "256MiB",
      timeoutSeconds: 30,
    },
    async (request) => {
      await assertAuth(request);

      const {email, displayName} = request.data || {};
      if (!email) {
        throw new HttpsError("invalid-argument", "Missing email");
      }

      const subject = "🆕 Nuovo utente in attesa di approvazione";
      const text =
        "È stato registrato un nuovo utente.\n\n" +
        `Nome: ${displayName || "Nuovo utente"}\n` +
        `Email: ${email}\n\n` +
        "Accedi al pannello Admin per approvare o rifiutare.";

      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
          <h2 style="color: #f97316;">🆕 Nuovo utente in attesa di approvazione</h2>
          <p>È stato registrato un nuovo utente.</p>
          <ul>
            <li><strong>Nome:</strong> ${displayName || "Nuovo utente"}</li>
            <li><strong>Email:</strong> ${email}</li>
          </ul>
          <p>Accedi al pannello Admin per approvare o rifiutare.</p>
        </div>
      `;

      const data = await sendEmail({to: ADMIN_EMAIL, subject, text, html});
      return {success: true, emailId: data?.id || null};
    },
);

/**
 * Callable: notifica utente approvato.
 */
exports.sendApprovalNotification = onCall(
    {
      secrets: [resendApiKey],
      region: "europe-west1",
      memory: "256MiB",
      timeoutSeconds: 30,
    },
    async (request) => {
      await assertAuth(request, true);

      const {email, displayName} = request.data || {};
      if (!email) {
        throw new HttpsError("invalid-argument", "Missing email");
      }

      const subject = "✅ Account approvato - Aurora 4.0";
      const text =
        `Ciao ${displayName || "Utente"},\n\n` +
        "Il tuo account è stato approvato. Ora puoi accedere ad Aurora 4.0.\n\n" +
        "A presto,\nAurora 4.0";

      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
          <h2 style="color: #22c55e;">✅ Account approvato</h2>
          <p>Ciao <strong>${displayName || "Utente"}</strong>,</p>
          <p>Il tuo account è stato approvato. Ora puoi accedere ad Aurora 4.0.</p>
          <p>A presto!</p>
        </div>
      `;

      const data = await sendEmail({to: email, subject, text, html});
      return {success: true, emailId: data?.id || null};
    },
);

/**
 * Callable: notifica utente rifiutato.
 */
exports.sendRejectionNotification = onCall(
    {
      secrets: [resendApiKey],
      region: "europe-west1",
      memory: "256MiB",
      timeoutSeconds: 30,
    },
    async (request) => {
      await assertAuth(request, true);

      const {email, displayName, reason} = request.data || {};
      if (!email) {
        throw new HttpsError("invalid-argument", "Missing email");
      }

      const subject = "❌ Account non approvato - Aurora 4.0";
      const text =
        `Ciao ${displayName || "Utente"},\n\n` +
        "Il tuo account non è stato approvato.\n" +
        (reason ? `Motivo: ${reason}\n\n` : "\n") +
        "Per assistenza, contatta il supporto.";

      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
          <h2 style="color: #ef4444;">❌ Account non approvato</h2>
          <p>Ciao <strong>${displayName || "Utente"}</strong>,</p>
          <p>Il tuo account non è stato approvato.</p>
          ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ""}
          <p>Per assistenza, contatta il supporto.</p>
        </div>
      `;

      const data = await sendEmail({to: email, subject, text, html});
      return {success: true, emailId: data?.id || null};
    },
);

/**
 * Parsa il testo OCR di uno scontrino per estrarre importo, esercente, data e ora.
 *
 * @param {string} rawText - Testo estratto dall'OCR
 * @return {{amount: number|null, merchant: string|null, date: string|null, time: string|null}}
 */
function parseReceiptText(rawText) {
  if (!rawText) return {amount: null, merchant: null, date: null, time: null};

  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);

  // 1. Estrai importo totale
  let amount = null;
  // Pattern: TOTALE / TOTAL / TOT. / IMPORTO / DOVUTO seguito da importo
  const totalPatterns = [
    new RegExp(
        "(?:TOTALE\\s*(?:COMPLESSIVO)?|TOTAL[E]?|TOT\\.|IMPORTO\\s*(?:DOVUTO)?|DOVUTO|PAGAMENTO|PAGATO)\\s*(?:EUR|€)?\\s*[:\\s]*(\\d{1,6}[.,]\\d{2})",
        "i",
    ),
    /(?:EUR|€)\s*(\d{1,6}[.,]\d{2})\s*$/im,
    /(\d{1,6}[.,]\d{2})\s*(?:EUR|€)/im,
  ];

  for (const pattern of totalPatterns) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const match = lines[i].match(pattern);
      if (match) {
        amount = parseFloat(match[1].replace(",", "."));
        break;
      }
    }
    if (amount !== null) break;
  }

  // Fallback: prendi l'ultimo importo presente nello scontrino
  if (amount === null) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const match = lines[i].match(/(\d{1,6}[.,]\d{2})/);
      if (match) {
        amount = parseFloat(match[1].replace(",", "."));
        break;
      }
    }
  }

  // 2. Estrai nome esercente (di solito nelle prime righe)
  let merchant = null;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    // Salta righe con solo numeri, date, partita IVA, codice fiscale
    if (/^\d+$/.test(line)) continue;
    if (/^[\d/.\s:-]+$/.test(line)) continue;
    if (/P\.?\s*IVA|C\.?\s*F\.|FISCAL|SCONTRINO|DOCUMENTO|RICEVUTA/i.test(line)) continue;
    if (line.length < 3) continue;
    merchant = line;
    break;
  }

  // 3. Estrai data (DD/MM/YYYY o DD-MM-YYYY o DD.MM.YYYY)
  let date = null;
  const datePattern = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/;
  for (const line of lines) {
    const match = line.match(datePattern);
    if (match) {
      let [, day, month, year] = match;
      if (year.length === 2) {
        year = "20" + year;
      }
      // Valida la data
      const d = parseInt(day, 10);
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2000 && y <= 2099) {
        date = `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        break;
      }
    }
  }

  const time = extractReceiptTime(rawText);
  return {amount, merchant, date, time};
}

/**
 * Runs OCR + parsing for a receipt image.
 * @param {string} imageBase64
 * @return {Promise<{rawText: string, parsed: {
 *   amount: number|null, merchant: string|null, date: string|null, time: string|null
 * }}>}
 */
async function analyzeReceiptImage(imageBase64) {
  const base64Clean = imageBase64.replace(
      /^data:image\/[a-zA-Z+]+;base64,/,
      "",
  );

  const apiKey = visionApiKey.value();
  if (!apiKey) {
    throw new Error("GOOGLE_VISION_API_KEY non configurata");
  }

  const visionUrl =
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

  const visionResponse = await fetch(visionUrl, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      requests: [
        {
          image: {content: base64Clean},
          features: [{type: "TEXT_DETECTION", maxResults: 1}],
        },
      ],
    }),
  });

  if (!visionResponse.ok) {
    const errorBody = await visionResponse.text();
    console.error("Vision API error:", errorBody);
    throw new Error(`Vision API error: ${visionResponse.status}`);
  }

  const visionData = await visionResponse.json();
  const annotation =
    visionData.responses?.[0]?.textAnnotations?.[0];
  const rawText = annotation?.description || "";
  const parsed = parseReceiptText(rawText);

  return {rawText, parsed};
}

/**
 * Cloud Function per analizzare scontrini tramite Google Cloud Vision API.
 * Riceve un'immagine in base64, estrae il testo OCR e parsa importo/esercente/data.
 */
exports.analyzeReceipt = onRequest(
    {
      secrets: [visionApiKey],
      region: "europe-west1",
      memory: "256MiB",
      timeoutSeconds: 30,
      cors: true,
    },
    async (req, res) => {
      try {
        const {imageBase64} = req.body;

        if (!imageBase64) {
          res.status(400).json({
            success: false,
            error: "Parametro imageBase64 mancante",
          });
          return;
        }

        const {rawText, parsed} = await analyzeReceiptImage(imageBase64);

        res.status(200).json({
          success: true,
          data: {
            amount: parsed.amount,
            merchant: parsed.merchant,
            date: parsed.date,
            time: parsed.time,
            rawText: rawText,
          },
        });
      } catch (error) {
        console.error("analyzeReceipt error:", error);
        res.status(500).json({
          success: false,
          error: error.message || "Errore durante l'analisi dello scontrino",
        });
      }
    },
);

/**
 * Callable: analizza scontrino via OCR.
 */
exports.analyzeReceiptCallable = onCall(
    {
      secrets: [visionApiKey],
      region: "europe-west1",
      memory: "256MiB",
      timeoutSeconds: 30,
    },
    async (request) => {
      await assertAuth(request);

      const {imageBase64} = request.data || {};
      if (!imageBase64) {
        throw new HttpsError("invalid-argument", "Parametro imageBase64 mancante");
      }

      const {rawText, parsed} = await analyzeReceiptImage(imageBase64);

      return {
        success: true,
        data: {
          amount: parsed.amount,
          merchant: parsed.merchant,
          date: parsed.date,
          time: parsed.time,
          rawText: rawText,
        },
      };
    },
);
