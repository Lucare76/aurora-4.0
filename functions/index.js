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
const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const {Resend} = require("resend");
const {DateTime} = require("luxon");

// Inizializza Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Definisci il secret per Resend
const resendApiKey = defineSecret("RESEND_API_KEY");

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

  return new Resend(apiKey);
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
function buildEmail(daysBefore, items, userName = '') {
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
            `).join('')}
          </td>
        </tr>
      </table>
    `;

  const text =
    `Ciao${userName ? ' ' + userName : ''},\n\n` +
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
                Mancano solo ${daysBefore} ${daysBefore === 1 ? 'giorno' : 'giorni'}!
              </p>
            </td>
          </tr>
          <!-- BODY -->
          <tr>
            <td style="padding:30px; color:#374151; font-size:15px; line-height:1.6;">
              <p style="margin-top:0;">
                Ciao${userName ? ' <strong>' + userName + '</strong>' : ''} 👋
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
        snap = await db.collection("birthdays").get();
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
          const userSnap = await db.collection("users").doc(userId).get();
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
          const batch = db.batch();
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
        const snap = await db.collection("birthdays").get();
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
            const userSnap = await db.collection("users").doc(userId).get();
            
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