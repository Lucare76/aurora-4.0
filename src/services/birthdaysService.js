// src/services/birthdaysService.js
import { db } from './firebase';

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore';

const COLLECTION_NAME = 'birthdays';

/**
 * Aggiunge un nuovo compleanno
 */
export async function addBirthday(userId, birthdayData) {
  try {
    if (!db || !userId) {
      throw new Error('Firebase o userId non disponibili');
    }

    const dataToSave = {
      userId,
      name: birthdayData.name,
      date: birthdayData.date, // formato DD/MM
      birthYear: birthdayData.birthYear
        ? Number(birthdayData.birthYear)
        : null,
      email: birthdayData.email || '',
      notes: birthdayData.notes || '',
      notificationSent: false,
      lastNotificationYear: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(
      collection(db, COLLECTION_NAME),
      dataToSave
    );

    console.log('✅ Compleanno salvato:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('❌ Errore addBirthday:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Recupera tutti i compleanni dell’utente
 * (senza orderBy → niente indici Firestore richiesti)
 */
export async function getBirthdays(userId) {
  try {
    if (!db || !userId) {
      throw new Error('Firebase o userId non disponibili');
    }

    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    const birthdays = [];

    snapshot.forEach((d) => {
      birthdays.push({
        id: d.id,
        ...d.data()
      });
    });

    return birthdays;
  } catch (error) {
    console.error('❌ Errore getBirthdays:', error);
    return [];
  }
}

/**
 * Aggiorna un compleanno
 */
export async function updateBirthday(birthdayId, updates) {
  try {
    const ref = doc(db, COLLECTION_NAME, birthdayId);

    await updateDoc(ref, {
      ...updates,
      updatedAt: Timestamp.now()
    });

    return { success: true };
  } catch (error) {
    console.error('❌ Errore updateBirthday:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Elimina un compleanno
 */
export async function deleteBirthday(birthdayId) {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, birthdayId));
    return { success: true };
  } catch (error) {
    console.error('❌ Errore deleteBirthday:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Ritorna i compleanni che cadono tra 2 giorni
 */
export function checkUpcomingBirthdays(birthdays) {
  const today = new Date();
  const target = new Date(today);
  target.setDate(today.getDate() + 2);

  const targetDay = target.getDate();
  const targetMonth = target.getMonth() + 1;
  const currentYear = today.getFullYear();

  return birthdays.filter((b) => {
    if (!b.date) return false;

    const [day, month] = b.date.split('/').map(Number);

    return (
      day === targetDay &&
      month === targetMonth &&
      b.lastNotificationYear !== currentYear
    );
  });
}

/**
 * Calcola età (se anno di nascita presente)
 */
export function calculateAge(birthdayDate, birthYear) {
  if (!birthdayDate || !birthYear) return null;

  const today = new Date();
  const [day, month] = birthdayDate.split('/').map(Number);

  let age = today.getFullYear() - birthYear;

  if (
    today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month && today.getDate() < day)
  ) {
    age--;
  }

  return age;
}

/**
 * Giorni mancanti al compleanno
 */
export function getDaysUntilBirthday(birthdayDate) {
  if (!birthdayDate) return null;

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [day, month] = birthdayDate.split('/').map(Number);

  const nextBirthday = new Date(
    todayStart.getFullYear(),
    month - 1,
    day
  );

  if (nextBirthday < todayStart) {
    nextBirthday.setFullYear(todayStart.getFullYear() + 1);
  }

  const diffMs = nextBirthday.getTime() - todayStart.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
