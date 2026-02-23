// scripts/seedAdminCategories.cjs
// Esegui una volta sola per caricare le categorie dell'admin

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, query, where, getDocs } = require('firebase/firestore');

// Config Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCZAsfa9YloWpHqsh60oVJ67IpOR1AkFPU",
  authDomain: "aurora-4-0.firebaseapp.com",
  projectId: "aurora-4-0",
  storageBucket: "aurora-4-0.firebasestorage.app",
  messagingSenderId: "382079072942",
  appId: "1:382079072942:web:1bf3dc235f366dc0c24b3f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ADMIN_EMAIL = 'lucarenna76@gmail.com';

const CATEGORIES = [
  {
    name: 'Scommesse',
    icon: '🎲',
    color: '#ef4444',
    type: 'expense',
    subCategories: ['Betfair', 'Bwin', 'Eurobet', 'Snai']
  },
  {
    name: 'Temu',
    icon: '🛍️',
    color: '#f97316',
    type: 'expense',
    subCategories: []
  },
  {
    name: 'Wish',
    icon: '🛒',
    color: '#8b5cf6',
    type: 'expense',
    subCategories: []
  },
  {
    name: 'Cash Back',
    icon: '💰',
    color: '#22c55e',
    type: 'expense',
    subCategories: []
  },
  {
    name: 'Compenso lavoro autonomo',
    icon: '💼',
    color: '#3b82f6',
    type: 'income',
    subCategories: []
  },
  {
    name: 'Disoccupazione',
    icon: '📋',
    color: '#6366f1',
    type: 'income',
    subCategories: []
  },
  {
    name: 'Entrate varie',
    icon: '💵',
    color: '#10b981',
    type: 'income',
    subCategories: ['Interessi Attivi', 'Regali', 'Rimborsi']
  },
  {
    name: 'Mance',
    icon: '🎁',
    color: '#14b8a6',
    type: 'income',
    subCategories: ['Tips', 'Rimborso cellulare']
  },
  {
    name: 'Stipendio',
    icon: '💳',
    color: '#06b6d4',
    type: 'income',
    subCategories: []
  },
  {
    name: 'Abbigliamento',
    icon: '👔',
    color: '#ec4899',
    type: 'expense',
    subCategories: ['Accessori', 'Calzature', 'Intimo', 'Pulisecco', 'Sportivo', 'Vestiario']
  },
  {
    name: 'Abitazione',
    icon: '🏠',
    color: '#f59e0b',
    type: 'expense',
    subCategories: ['Biancheria', 'Geometra', 'Manutenzione Ordinaria', 'Pulizie', 'Sfratto']
  },
  {
    name: 'Alimentari',
    icon: '🍕',
    color: '#ef4444',
    type: 'expense',
    subCategories: ['Frutta e Verdura', 'Gastronomia', 'Integratori', 'Macelleria', 'Pasticceria - Gelateria', 'Supermarket']
  },
  {
    name: 'Aurora',
    icon: '👶',
    color: '#fbbf24',
    type: 'expense',
    subCategories: [
      'Abbigliamento', 'Acqua Amorosa', 'Carrozzino', 'Ciucciotti', 'Crema Solare', 'Cuscino',
      'Fasciatoio', 'Fisioterapia', 'Infermiera', 'Latte', 'Logopedia', 'Medicinali',
      'Omogenizzati', 'Pannolini', 'Primi Anni', 'Salviettine', 'Visite Specialistiche'
    ]
  },
  {
    name: 'Auto',
    icon: '🚗',
    color: '#3b82f6',
    type: 'expense',
    subCategories: [
      'Assicurazione', 'Autostrada', 'Benzina', 'Bollo', 'Collaudo', 'Lavaggio',
      'Manutenzione', 'Multe', 'Noleggio', 'Parcheggio', 'Tagliando'
    ]
  },
  {
    name: 'Battesimo',
    icon: '⛪',
    color: '#a855f7',
    type: 'expense',
    subCategories: ['Bomboniere', 'Pasticceria', 'Ristorante']
  },
  {
    name: 'Beni Durevoli',
    icon: '📺',
    color: '#6366f1',
    type: 'expense',
    subCategories: [
      'Arredamento', 'Computer e periferiche', 'Elettrodomestici', 'Manutenzioni',
      'Ricambi Cellulare', 'Telefono', 'Videoregistratore'
    ]
  },
  {
    name: 'Canone posteclick',
    icon: '🏦',
    color: '#dc2626',
    type: 'expense',
    subCategories: []
  },
  {
    name: 'Casa Ischia',
    icon: '🏖️',
    color: '#14b8a6',
    type: 'expense',
    subCategories: [
      'Acqua', 'Affitto', 'Arredamento', 'Bollitore', 'Bombola', 'Carrozzino', 'Cauzione',
      'Ciucciotto', 'Condizionatore', 'Culla', 'Detersivi', 'Elettrodomesti', 'Espurgo',
      'Fasciatoio', 'Gasolio', 'Gravidanza', 'Internet', 'Lenzuoli', 'Luce', 'Manutenzione',
      'Primi Anni', 'Pulizie', 'Ristorante', 'Spese Condominiali', 'Supermercato', 'Utensili'
    ]
  },
  {
    name: 'Cultura',
    icon: '🎨',
    color: '#8b5cf6',
    type: 'expense',
    subCategories: ['Mostre e musei']
  },
  {
    name: 'Estetica',
    icon: '💇',
    color: '#ec4899',
    type: 'expense',
    subCategories: ['Accessori', 'Barbiere', 'Cosmetici', 'Estetista', 'Lampade', 'Massaggi']
  },
  {
    name: 'Primi Anni',
    icon: '🍼',
    color: '#fbbf24',
    type: 'expense',
    subCategories: ['Latte', 'Pannolini', 'Salviettine']
  },
  {
    name: 'Salute',
    icon: '⚕️',
    color: '#ef4444',
    type: 'expense',
    subCategories: ['Attrezzature mediche', 'Dentista', 'Medicinali', 'Occhiali', 'Visite specialistiche']
  },
  {
    name: 'Scooter',
    icon: '🛵',
    color: '#06b6d4',
    type: 'expense',
    subCategories: ['Assicurazione', 'Benzina', 'Bollo', 'Collaudo', 'Manutenzione', 'Tagliando']
  },
  {
    name: 'Scuola',
    icon: '🎓',
    color: '#3b82f6',
    type: 'expense',
    subCategories: []
  },
  {
    name: 'Settimanale',
    icon: '📅',
    color: '#6366f1',
    type: 'expense',
    subCategories: []
  },
  {
    name: 'Sport',
    icon: '⚽',
    color: '#10b981',
    type: 'expense',
    subCategories: ['Palestra']
  },
  {
    name: 'Stipendi',
    icon: '💰',
    color: '#22c55e',
    type: 'income',
    subCategories: []
  },
  {
    name: 'Tasse',
    icon: '🧾',
    color: '#dc2626',
    type: 'expense',
    subCategories: [
      'Canone Hype', 'Commissione Scalable', 'Commissioni Banca', 'Imposta di Bollo',
      'Tassa Paypal', 'Varie'
    ]
  },
  {
    name: 'Tempo Libero',
    icon: '🎉',
    color: '#f59e0b',
    type: 'expense',
    subCategories: [
      'Cinema', 'Concerto', 'Mare', 'Museo', 'Paninoteca', 'Pizzeria', 'Ristorante',
      'Spiaggia', 'Stadio', 'Teatro', 'Vacanze'
    ]
  },
  {
    name: 'Trasporti e viaggi',
    icon: '✈️',
    color: '#06b6d4',
    type: 'expense',
    subCategories: [
      'Aereo', 'Aliscafo', 'Alloggio', 'Assicurazione Motorino', 'Autobus', 'Circumvesuviana',
      'Metro', 'Nave', 'Taxi', 'Treno'
    ]
  },
  {
    name: 'Uscite varie',
    icon: '💸',
    color: '#8b5cf6',
    type: 'expense',
    subCategories: [
      'Abbonamento Juventus', 'Cinturino Orologio', 'Commissioni Postepay', 'Interessi Passivi',
      'Regali', 'Ricarica Postepay'
    ]
  },
  {
    name: 'Utenze',
    icon: '💡',
    color: '#f59e0b',
    type: 'expense',
    subCategories: [
      'Abbonamenti Internet', 'Abbonamento Dazn', 'Acqua', 'Cellulare', 'Elettricità', 'Gas',
      'Internet e Telefonia', 'Luce', 'Ricacica Very', 'Ricarica HO', 'Ricarica Iliad',
      'Ricarica Very', 'Ricarica Vodafone', 'Tasse rifiuti', 'Telefono fisso 1° gestore',
      'Telefono fisso 2° gestore'
    ]
  },
  {
    name: 'Vacanza Puglia 2023',
    icon: '🌊',
    color: '#14b8a6',
    type: 'expense',
    subCategories: ['Albergo', 'Benzina', 'Olio', 'Ristorante', 'Tassa di soggiorno', 'Traghetto']
  },
  {
    name: 'Viaggio in Puglia 2025',
    icon: '🏝️',
    color: '#06b6d4',
    type: 'expense',
    subCategories: [
      'Benzina', 'Caparra', 'Gelateria', 'Hotel', 'Ristorante', 'Tassa di soggiorno',
      'Traghetto', 'Zoo'
    ]
  },
  {
    name: 'Viaggio Londra',
    icon: '🇬🇧',
    color: '#3b82f6',
    type: 'expense',
    subCategories: [
      'Acquario', 'Aereo', 'Alibus', 'Aliscafo', 'Hotel', 'Metro', 'Ristorante',
      'Supermercato', 'Taxi', 'Varie'
    ]
  }
];

async function seedCategories() {
  const adminUserId = process.argv[2];
  if (!adminUserId) {
    console.error('❌ Devi passare il userId come argomento.');
    console.error('   Uso: node scripts/seedAdminCategories.cjs <userId>');
    process.exit(1);
  }
  try {
    console.log(`✅ Admin userId: ${adminUserId}`);

    console.log(`📦 Caricamento di ${CATEGORIES.length} categorie...`);

    for (const cat of CATEGORIES) {
      const categoryData = {
        userId: adminUserId,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        subCategories: cat.subCategories.map((name, index) => ({
          id: `sub_${Date.now()}_${index}`,
          name
        })),
        createdAt: new Date()
      };

      await addDoc(collection(db, 'categories'), categoryData);
      console.log(`  ✓ ${cat.name} (${cat.subCategories.length} sottocategorie)`);
    }

    console.log('\n✅ Seed completato con successo!');
    console.log(`📊 Totale: ${CATEGORIES.length} categorie caricate per ${ADMIN_EMAIL}`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Errore durante il seed:', error);
    process.exit(1);
  }
}

seedCategories();
