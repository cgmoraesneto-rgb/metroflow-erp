import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
    try {
        console.log(`Connecting to Firestore DB: ${config.firestoreDatabaseId}`);
        const querySnapshot = await getDocs(collection(db, "employees"));
        console.log(`✅ Success! Found ${querySnapshot.size} employees.`);
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log(`  - ID: ${doc.id} | Nome: ${data.nome || 'N/A'} | Username: ${data.username || 'N/A'}`);
        });
    } catch (e) {
        console.error("❌ Failed to connect:", e.message);
    }
    process.exit(0);
}
run();
