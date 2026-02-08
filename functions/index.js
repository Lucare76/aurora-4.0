/**
 * Birthday reminder scheduler (email).
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
 *  - birthDate: "YYYY-MM-DD"  (month/day used)
 *  - lastReminderYear?: number
 */

const admin = require("firebase-admin");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {defineSecret} = require("firebase-functions/params");
const nodemailer = require("nodemailer");
const {DateTime} = require("luxon");

// Inizializza Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Definisci i secrets da Secret Manager
const smtpHost = defineSecret("SMTP_HOST");
const smtpUser = defineSecret("BREVO_SMTP_USER");
const smtpPass = defineSecret("BREVO_SMTP_PASS");

/**
 * Returns a Nodemailer transporter using SMTP secrets.
 * @return {import("nodemailer").Transporter} transporter
 */
function getTransporter() {
  const host = smtpHost.value();
  const port = 587;
  const user = smtpUser.value();
  const pass = smtpPass.value();

  if (!host || !user || !pass) {
    throw new Error(
        "Missing SMTP secrets. Check Secret Manager " +
        "(SMTP_HOST, BREVO_SMTP_USER, BREVO_SMTP_PASS).",
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: false, // TLS su porta 587
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Compute next birthday date (this year or next) in Europe/Rome.
 * It uses month/day from birthDateStr ("YYYY-MM-DD").
 * Handles Feb 29 -> Feb 28 for non-leap years.
 *
 * @param {string} birthDateStr - YYYY-MM-DD
 * @param {DateTime} nowRome - Luxon DateTime in Europe/Rome
 * @return {DateTime|null} Next birthday date or null if invalid input
 */
function getNextBirthdayDate(birthDateStr, nowRome) {
  const parts = String(birthDateStr || "").split("-");
  if (parts.length !== 3) {
    return null;
  }

  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (!month || !day) {
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
 * Build email content.
 * @param {number} daysBefore - reminder offset days
 * @param {Array<{name: string, iso: string, dateLabel: string}>} items
 * @return {{subject: string, text: string, html: string}}
 */
function buildEmail(daysBefore, items) {
  const subject = `Promemoria compleanni tra ${daysBefore} giorni 🎂`;

  const sorted = [...items].sort((a, b) => a.iso.localeCompare(b.iso));
  const listText = sorted.map((x) => `• ${x.name} – ${x.dateLabel}`).join("\n");
  const listHtml = sorted
      .map((x) => `<li><b>${x.name}</b> – ${x.dateLabel}</li>`)
      .join("");

  const text =
    "Ciao,\n\n" +
    `ti ricordiamo che tra ${daysBefore} giorni sarà il compleanno di:\n\n` +
    `${listText}\n\n` +
    "Buona giornata!\n";

  const html =
    "<p>Ciao,</p>" +
    `<p>ti ricordiamo che tra <b>${daysBefore} giorni</b> ` +
    "sarà il compleanno di:</p>" +
    `<ul>${listHtml}</ul>` +
    "<p>Buona giornata!</p>";

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
      secrets: [smtpHost, smtpUser, smtpPass],
      memory: "256MiB",
      timeoutSeconds: 540,
    },
    async () => {
      console.log("Starting birthday reminder job...");

      const nowRome = DateTime.now().setZone("Europe/Rome");
      const defaultDaysBefore = 2;
      const target = nowRome.plus({days: defaultDaysBefore}).startOf("day");

      console.log(`Looking for birthdays on: ${target.toISODate()}`);

      let transporter;
      try {
        transporter = getTransporter();
      } catch (error) {
        console.error("Failed to create email transporter:", error);
        throw error;
      }

      const fromEmail = smtpUser.value();

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
        if (!d.userId || !d.name || !d.birthDate) {
          console.log(`Skipping invalid birthday doc: ${doc.id}`);
          return;
        }

        const next = getNextBirthdayDate(d.birthDate, nowRome);
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

          // Invia email
          await transporter.sendMail({
            from: `"Promemoria Compleanni" <${fromEmail}>`,
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
