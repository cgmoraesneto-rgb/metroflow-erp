import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, query, where, updateDoc } from 'firebase/firestore';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
dotenv.config({ path: join(__dirname, '../.env') });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrate() {
  const oldId = "CLI-1777297409616";
  
  console.log("Iniciando migração de ID do cliente...");
  
  // 1. Encontrar o próximo ID sequencial
  const clientsSnap = await getDocs(collection(db, "clients"));
  const clients = clientsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  if (clients.length === 0) {
    console.error("Nenhum cliente encontrado no banco!");
    return;
  }

  const numericIds = clients
    .map(c => {
      const numericPart = c.id.replace(/\D/g, '');
      return numericPart.length > 0 && numericPart.length < 10 ? parseInt(numericPart, 10) : null;
    })
    .filter(id => id !== null);

  const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
  const nextId = (maxId + 1).toString().padStart(4, '0');
  
  console.log(`Próximo ID sequencial identificado: ${nextId}`);

  // 2. Verificar se o cliente alvo existe
  const targetDoc = clientsSnap.docs.find(d => d.id === oldId);
  if (!targetDoc) {
    console.error(`Cliente com ID ${oldId} não encontrado!`);
    // Pode ser que o ID não tenha o prefixo CLI- no documento mas tenha no campo? 
    // Ou vice-versa. Vamos checar se algum documento tem esse ID no campo 'id' caso o doc.id seja diferente.
    const altTarget = clientsSnap.docs.find(d => d.data().id === oldId);
    if (!altTarget) {
        process.exit(1);
    }
    console.log("Cliente encontrado por campo de ID interno.");
  }

  console.log(`Migrando cliente ${oldId} -> ${nextId}`);

  // 3. Mover o documento do cliente
  const clientData = targetDoc.data();
  // Se o campo interno 'id' existir, atualizamos ele também
  const updatedClientData = { ...clientData };
  if (updatedClientData.id) updatedClientData.id = nextId;

  await setDoc(doc(db, "clients", nextId), updatedClientData);
  await deleteDoc(doc(db, "clients", oldId));
  console.log("✓ Documento do cliente movido com sucesso.");

  // 4. Atualizar referências em outras coleções
  const updates = [
    { coll: "quotes", field: "clienteId" },
    { coll: "service_orders", field: "clienteId" },
    { coll: "calibration_records", field: "clientId" },
    { coll: "financial_controls", field: "clienteId" },
    { coll: "instrument_cards", field: "clientId" }
  ];

  for (const { coll, field } of updates) {
    try {
        const q = query(collection(db, coll), where(field, "==", oldId));
        const snap = await getDocs(q);
        if (!snap.empty) {
            console.log(`Atualizando ${snap.size} referências em '${coll}'...`);
            for (const d of snap.docs) {
                await updateDoc(doc(db, coll, d.id), { [field]: nextId });
            }
            console.log(`✓ Coleção '${coll}' atualizada.`);
        }
    } catch (e) {
        console.warn(`Aviso: Falha ao atualizar coleção '${coll}':`, e.message);
    }
  }

  console.log("\n===============================================");
  console.log(`SUCESSO: Cliente migrado para o ID ${nextId}`);
  console.log("===============================================");
  process.exit(0);
}

migrate().catch(err => {
    console.error("ERRO CRÍTICO NA MIGRAÇÃO:", err);
    process.exit(1);
});
