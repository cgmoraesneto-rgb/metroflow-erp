
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

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

async function check() {
  try {
    const docRef = doc(db, 'quotes', 'OCW044526');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      console.log('Orçamento OCW044526 encontrado:', snap.data());
    } else {
      console.log('Orçamento OCW044526 NÃO encontrado no banco de dados.');
    }
    process.exit(0);
  } catch (e) {
    console.error('Erro ao verificar:', e);
    process.exit(1);
  }
}

check();
