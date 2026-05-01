
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAs-some-key", // I'll need to read the real config from the project
  authDomain: "banco-dado-metroflow-erp.firebaseapp.com",
  projectId: "banco-dado-metroflow-erp",
  storageBucket: "banco-dado-metroflow-erp.appspot.com",
  messagingSenderId: "367175204481",
  appId: "1:367175204481:web:4f62e153835e9f1400ba60"
};

// Actually, I'll just look at firebaseConfig.ts in the project
