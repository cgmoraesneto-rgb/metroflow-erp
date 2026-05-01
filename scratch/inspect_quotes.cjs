
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDrywvoZ7_akbYiyPyBvSl8_Bn5vCP8UiI",
  authDomain: "banco-dado-metroflow-erp.firebaseapp.com",
  projectId: "banco-dado-metroflow-erp",
  storageBucket: "banco-dado-metroflow-erp.firebasestorage.app",
  messagingSenderId: "766074425458",
  appId: "1:766074425458:web:cb1ed5a4ad0feb64df72eb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspect() {
  try {
    const qCol = collection(db, 'quotes');
    const snap = await getDocs(qCol);
    console.log(`Total de orçamentos encontrados: ${snap.size}`);
    
    snap.forEach(doc => {
      const data = doc.data();
      if (doc.id.includes('44526') || data.id?.includes('44526')) {
        console.log(`- ID do Doc: ${doc.id} | Status: ${data.status} | Criado por: ${data.criadoPor}`);
      }
    });

    process.exit(0);
  } catch (e) {
    console.error('Erro ao inspecionar:', e);
    process.exit(1);
  }
}

inspect();
