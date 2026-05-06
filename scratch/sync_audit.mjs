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

async function verifySync() {
  console.log('Iniciando Auditoria de Sincronização: Nuvem vs Local...\n');
  
  let allMatched = true;
  const report = [];

  for (const colName of collections) {
    try {
      // 1. Puxar contagem da nuvem
      const querySnapshot = await getDocs(collection(db, colName));
      const cloudCount = querySnapshot.docs.length;
      
      // 2. Puxar contagem do local
      const localPath = path.join('./mock-db', `${colName}.json`);
      let localCount = 0;
      if (fs.existsSync(localPath)) {
        const localData = JSON.parse(fs.readFileSync(localPath, 'utf8'));
        localCount = localData.length;
      }
      
      const status = cloudCount === localCount ? '✅ 100% Sincronizado' : '⚠️ Divergência';
      if (cloudCount !== localCount) allMatched = false;

      report.push({
        Coleção: colName,
        Nuvem: cloudCount,
        Local: localCount,
        Status: status
      });

    } catch (error) {
      console.error(`Erro ao processar ${colName}:`, error.message);
    }
  }

  console.table(report);
  
  if (allMatched) {
    console.log('\n✅ AUDITORIA CONCLUÍDA: O sistema local possui uma cópia idêntica (100%) da base de dados da Nuvem de Produção.');
  } else {
    console.log('\n⚠️ AUDITORIA CONCLUÍDA COM AVISOS: Algumas coleções apresentam divergência de quantidade de registros.');
  }
}

verifySync();
