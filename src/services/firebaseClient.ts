// src/services/firebaseClient.ts
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc, 
  query, 
  where, 
  getDoc,
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { z } from 'zod';
import { captureError } from '../sentry';

// Generic converter for Firestore to keep it type-safe
const genericConverter = <T extends { id?: string }>(): FirestoreDataConverter<T> => ({
  toFirestore(item: T): DocumentData {
    // Remove ID before saving to Firestore if we want it as the document name
    const { id, ...data } = item;
    return data;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): T {
    const data = snapshot.data(options);
    return { id: snapshot.id, ...data } as T;
  }
});

export const firebaseClient = {
  async fetch<T extends { id?: string }>(path: string, schema?: z.ZodSchema<T>): Promise<T[]> {
    try {
      // Map mock paths to collection names
      const collectionName = path.replace('/api/mock/', '');
      const colRef = collection(db, collectionName).withConverter(genericConverter<T>());
      const snapshot = await getDocs(colRef);
      const data = snapshot.docs.map(doc => doc.data());

      if (schema) {
        // Validate each item (optional, can be expensive for lists)
        return data.filter(item => {
          const result = schema.safeParse(item);
          if (!result.success) {
            captureError(result.error, { path, type: 'firebase_validation_error', itemId: item.id });
            return false;
          }
          return true;
        });
      }

      return data;
    } catch (error) {
      captureError(error, { path, method: 'FIREBASE_FETCH' });
      throw error;
    }
  },

  async post<T extends { id?: string }>(path: string, body: any, schema?: z.ZodSchema<T>): Promise<T> {
    try {
      const collectionName = path.replace('/api/mock/', '');
      
      // Ensure we have an ID. If it starts with "temp-" or "REQ-", we treat it as the final ID
      // Otherwise, Firestore would auto-generate one if we used addDoc.
      // We'll use setDoc for consistent ID management from the app.
      let docId = body.id;
      if (!docId) {
        // Auto-generate one if not provided (rare in our system as we pre-generate IDs)
        const colRef = collection(db, collectionName);
        docId = doc(colRef).id;
      }

      // Sanitize body (remove undefined and nested undefined)
      const sanitizedBody = JSON.parse(JSON.stringify(body));
      const finalItem = { ...sanitizedBody, id: docId };

      const docRef = doc(db, collectionName, docId).withConverter(genericConverter<T>());
      await setDoc(docRef, finalItem, { merge: true });

      if (schema) {
        const result = schema.safeParse(finalItem);
        if (!result.success) {
          captureError(result.error, { path, type: 'firebase_post_validation_error' });
          throw new Error('Firebase validation failed');
        }
        return result.data;
      }

      return finalItem as T;
    } catch (error) {
      captureError(error, { path, method: 'FIREBASE_POST' });
      throw error;
    }
  },

  async delete(path: string): Promise<void> {
    try {
      // Logic for /api/mock/collection/id
      const parts = path.replace('/api/mock/', '').split('/');
      if (parts.length < 2) throw new Error('Invalid path for delete');
      
      const collectionName = parts[0];
      const docId = parts[1];

      const docRef = doc(db, collectionName, docId);
      await deleteDoc(docRef);
    } catch (error) {
      captureError(error, { path, method: 'FIREBASE_DELETE' });
      throw error;
    }
  }
};
