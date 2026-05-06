// src/services/apiClient.ts
import { z } from 'zod';
import { captureError } from '../sentry';
import { firebaseClient } from './firebaseClient';

export class ApiError extends Error {
  constructor(public message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

// -------------------------------------------------------------
// METROFLOW ERP GLOBAL DATA ADAPTER
// Switches between Mock Server (Vite plugin) and Real Firestore.
// -------------------------------------------------------------
export const apiClient = {
  // Flag to force real database usage in production/staging
  useRealDatabase: import.meta.env.PROD, 

  async fetch<T extends { id?: string }>(url: string, schema?: z.ZodSchema<T>): Promise<T[]> {
    if (this.useRealDatabase) {
      return firebaseClient.fetch<T>(url, schema);
    }
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new ApiError(`Fetch failed: ${response.statusText}`, response.status);
      }
      const data = await response.json();
      
      if (schema) {
        // Mock server validation
        const result = z.array(schema).safeParse(data); // Assume fetch returns an array for lists
        if (!result.success) {
          captureError(result.error, { url, type: 'validation_error' });
          throw new ApiError('Data validation failed');
        }
        return result.data;
      }
      
      return data as T[];
    } catch (error) {
      captureError(error, { url, method: 'FETCH' });
      throw error;
    }
  },

  async fetchPaginated<T extends { id?: string }>(
    url: string, 
    pageSize: number = 20, 
    lastVisible: any = null,
    orderField: string = 'id',
    orderDir: 'asc' | 'desc' = 'desc'
  ): Promise<{ data: T[]; lastVisible: any }> {
    if (this.useRealDatabase) {
      return firebaseClient.fetchPaginated<T>(url, pageSize, lastVisible, orderField, orderDir);
    }
    
    // Simulação básica para Mock: retorna tudo e sem cursor
    const data = await apiClient.fetch<T>(url);
    return { data, lastVisible: null };
  },

  async post<T extends { id?: string }>(url: string, body: any, schema?: z.ZodSchema<T>): Promise<T> {
    if (this.useRealDatabase) {
      return firebaseClient.post<T>(url, body, schema);
    }

    try {
      // Sanitize body (remove undefined)
      const sanitizedBody = JSON.parse(JSON.stringify(body));

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedBody),
      });

      if (!response.ok) {
        const errorMsg = await response.text();
        throw new ApiError(errorMsg || `Post failed: ${response.statusText}`, response.status);
      }

      const data = await response.json();

      if (schema) {
        const result = schema.safeParse(data);
        if (!result.success) {
          captureError(result.error, { url, type: 'post_validation_error' });
          throw new ApiError('Response validation failed');
        }
        return result.data;
      }

      return data as T;
    } catch (error) {
      captureError(error, { url, method: 'POST' });
      throw error;
    }
  },

  async delete(url: string): Promise<void> {
    if (this.useRealDatabase) {
      return firebaseClient.delete(url);
    }

    try {
      const response = await fetch(url, { method: 'DELETE' });
      if (!response.ok) {
        throw new ApiError(`Delete failed: ${response.statusText}`, response.status);
      }
    } catch (error) {
      captureError(error, { url, method: 'DELETE' });
      throw error;
    }
  }
};
