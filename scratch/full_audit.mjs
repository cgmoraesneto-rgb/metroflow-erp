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

const collectionsToCheck = [
  'clients',
  'employees',
  'quotes',
  'service_orders',
  'standard_instruments',
  'calibration_records',
  'financial_controls'
];

async function runAudit() {
  const auditResults = {};
  
  for (const colName of collectionsToCheck) {
    try {
      const querySnapshot = await getDocs(collection(db, colName));
      auditResults[colName] = querySnapshot.size;
      
      // Save full data for clients as requested
      if (colName === 'clients') {
        const clients = [];
        querySnapshot.forEach(doc => clients.push({ id: doc.id, ...doc.data() }));
        fs.writeFileSync('scratch/full_clients.json', JSON.stringify(clients, null, 2));
      }
    } catch (error) {
      auditResults[colName] = `ERRO: ${error.message}`;
    }
  }
  
  fs.writeFileSync('scratch/audit_summary.json', JSON.stringify(auditResults, null, 2));
  console.log('--- Auditoria Firestore Concluída ---');
  console.table(auditResults);
}

runAudit();
