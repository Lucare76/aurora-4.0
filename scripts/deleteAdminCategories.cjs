// scripts/deleteAdminCategories.cjs
// Uso: node scripts/deleteAdminCategories.cjs <userId>
// Trova il tuo userId in Firebase Console → Authentication → Users

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, deleteDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCZAsfa9YloWpHqsh60oVJ67IpOR1AkFPU",
  authDomain: "aurora-4-0.firebaseapp.com",
  projectId: "aurora-4-0",
  storageBucket: "aurora-4-0.firebasestorage.app",
  messagingSenderId: "382079072942",
  appId: "1:382079072942:web:1bf3dc235f366dc0c24b3f"
};

const userId = process.argv[2];

if (!userId) {
  console.error('❌ Devi passare il userId come argomento.');
  console.error('   Uso: node scripts/deleteAdminCategories.cjs <userId>');
  console.error('   Trova il userId in Firebase Console → Authentication → Users');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteAllCategories() {
  console.log(`🔍 Cerco categorie per userId: ${userId}`);

  const q = query(collection(db, 'categories'), where('userId', '==', userId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    console.log('ℹ️  Nessuna categoria trovata per questo userId.');
    process.exit(0);
  }

  console.log(`🗑️  Trovate ${snapshot.size} categorie. Eliminazione in corso...`);

  let count = 0;
  for (const docSnap of snapshot.docs) {
    await deleteDoc(docSnap.ref);
    count++;
    if (count % 10 === 0) console.log(`   ... ${count}/${snapshot.size} eliminate`);
  }

  console.log(`\n✅ Eliminate ${count} categorie per userId: ${userId}`);
  console.log('   Ora usa il pulsante "Carica categorie default" nell\'app per ricaricare le 38 categorie.');
  process.exit(0);
}

deleteAllCategories().catch((err) => {
  console.error('❌ Errore:', err.message);
  process.exit(1);
});
