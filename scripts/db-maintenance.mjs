import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

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

const collections = [
  'clients', 'employees', 'quotes', 'service_orders', 
  'standard_instruments', 'calibration_records', 'financial_controls',
  'price_tables', 'certificate_masks', 'procedures', 
  'payment_methods', 'banks'
];

async function runMaintenance(mode) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = mode === 'backup' ? `./backups/${timestamp}` : './mock-db';

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`--- Iniciando Modo: ${mode.toUpperCase()} ---`);
  
  for (const colName of collections) {
    try {
      const querySnapshot = await getDocs(collection(db, colName));
      const data = [];
      querySnapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      
      const filePath = path.join(backupDir, `${colName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`✅ ${colName}: ${data.length} registros salvos.`);
    } catch (error) {
      console.error(`❌ Erro em ${colName}:`, error.message);
    }
  }

  console.log(`\n--- Concluído! Arquivos salvos em: ${backupDir} ---`);
}

const mode = process.argv[2] || 'backup'; // 'backup' ou 'sync'
runMaintenance(mode === 'sync' ? 'sync' : 'backup');
