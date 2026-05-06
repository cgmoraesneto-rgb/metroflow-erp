import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const collectionsToExport = [
  'clients',
  'employees',
  'quotes',
  'service_orders',
  'standard_instruments',
  'calibration_records',
  'financial_controls',
  'price_tables',
  'instrument_types',
  'certificate_masks',
  'procedures',
  'payment_methods',
  'banks',
  'units_of_measure'
];

async function exportFullDb() {
  const fullExport = {};
  
  for (const colName of collectionsToExport) {
    try {
      console.log(`Exportando: ${colName}...`);
      const querySnapshot = await getDocs(collection(db, colName));
      const data = [];
      querySnapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() });
      });
      fullExport[colName] = data;
      console.log(`  -> ${data.length} documentos encontrados.`);
    } catch (error) {
      console.error(`Erro em ${colName}:`, error.message);
      fullExport[colName] = { error: error.message };
    }
  }
  
  fs.writeFileSync('scratch/full_db_export.json', JSON.stringify(fullExport, null, 2));
  console.log('--- Exportação Completa Concluída ---');
  console.log('Arquivo salvo em scratch/full_db_export.json');
}

exportFullDb();
