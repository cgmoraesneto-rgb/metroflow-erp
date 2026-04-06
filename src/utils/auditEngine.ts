import { AuditLog } from '../types';

/**
 * Industrial Audit Engine - Forensic Traceability & Integrity
 * Handles SHA-256 hash chaining and audit trail verification.
 */

/**
 * Generates a SHA-256 hash of a string using Web Crypto API.
 * Supports both Browser and Node.js (via globalThis.crypto).
 */
export async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Creates a new audit log entry with hash chaining.
 * The 'previousHash' ensures immutability.
 */
export async function createLogEntry(
  params: Omit<AuditLog, 'id' | 'hash' | 'timestamp'>,
  previousHash: string = '0'.repeat(64)
): Promise<AuditLog> {
  const entry: AuditLog = {
    ...params,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    previousHash,
    hash: ''
  };

  const payload = entry.previousHash + JSON.stringify({
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    userId: entry.userId,
    before: entry.before,
    after: entry.after,
    timestamp: entry.timestamp
  });

  entry.hash = await sha256(payload);
  return entry;
}

/**
 * Verifies the integrity of an audit chain.
 * If any log is modified or the chain is broken, returns false.
 */
export async function verifyAuditChain(logs: AuditLog[]): Promise<boolean> {
  if (logs.length === 0) return true;

  // Sort by timestamp to ensure correct order
  const sortedLogs = [...logs].sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 0; i < sortedLogs.length; i++) {
    const entry = sortedLogs[i];
    
    // 1. Verify previous hash link
    if (i > 0) {
      if (entry.previousHash !== sortedLogs[i - 1].hash) {
        console.error(`Audit Failure: Chain broken at log ${entry.id}`);
        return false;
      }
    }

    // 2. Re-calculate hash and verify
    const payload = entry.previousHash + JSON.stringify({
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      userId: entry.userId,
      before: entry.before,
      after: entry.after,
      timestamp: entry.timestamp
    });

    const calculatedHash = await sha256(payload);
    if (calculatedHash !== entry.hash) {
      console.error(`Audit Failure: Metadata mismatch in log ${entry.id}`);
      return false;
    }
  }

  return true;
}
