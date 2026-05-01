
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

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

async function fix() {
  try {
    const docRef = doc(db, 'quotes', 'OCW044526');
    // Using the exact value from the enum: "Aprovado"
    await updateDoc(docRef, { status: 'Aprovado' });
    console.log('Status do orçamento OCW044526 atualizado para "Aprovado" (Case-Sensitive fix) com sucesso!');
    process.exit(0);
  } catch (e) {
    console.error('Erro ao atualizar status:', e);
    process.exit(1);
  }
}

fix();
