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

async function listClients() {
  console.log('--- Iniciando Consulta ao Firestore ---');
  try {
    const querySnapshot = await getDocs(collection(db, 'clients'));
    const clients = [];
    querySnapshot.forEach((doc) => {
      clients.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`Sucesso: ${clients.length} registros encontrados.`);
    fs.writeFileSync('scratch/firestore_clients_snapshot.json', JSON.stringify(clients, null, 2));
    console.log('Snapshot salvo em scratch/firestore_clients_snapshot.json');
    
    // Output a summary table
    console.table(clients.map(c => ({
      ID: c.id,
      RazaoSocial: c.razaoSocial || c.name || 'N/A',
      CNPJ: c.cnpj || 'N/A',
      Status: c.status || 'N/A'
    })));
  } catch (error) {
    console.error('Erro ao acessar Firestore:', error);
  }
}

listClients();
