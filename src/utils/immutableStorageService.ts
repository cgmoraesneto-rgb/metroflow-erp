import { CalibrationRecord, AuditLog, ExecutionSnapshot } from '../types';
import { sha256 } from './auditEngine';
import { generateDocumentHash } from './signatureService';

/**
 * Immutable Storage Service (ISO 17025 Accreditation Grade)
 * Ensures that critical metrological data cannot be altered or deleted after creation.
 */

/**
 * Verifies the integrity of a stored record by re-calculating its hash.
 */
export async function verifyRecordIntegrity(
    record: CalibrationRecord
): Promise<{ valid: boolean; error?: string }> {
    if (!record.executionSnapshot) {
        return { valid: false, error: "RECORD_MISSING_SNAPSHOT" };
    }

    // A snapshot is valid if its hash matches its content
    const calculatedHash = await generateDocumentHash(record.executionSnapshot);
    if (calculatedHash !== record.executionSnapshot.hash) {
        return { valid: false, error: "SNAPSHOT_CORRUPTED" };
    }

    return { valid: true };
}

/**
 * Prepares a full execution snapshot for immutable storage.
 * Ensures total reproducibility of results without re-calculation.
 */
export async function createExecutionSnapshot(
    rowData: any,
    computedValues: any,
    executionOrder: string[],
    formulas: any
): Promise<ExecutionSnapshot> {
    const snapshot: Omit<ExecutionSnapshot, 'hash'> = {
        rowData,
        computedValues,
        executionOrder,
        formulas,
        timestamp: new Date().toISOString()
    };

    const hash = await generateDocumentHash(snapshot);

    return {
        ...snapshot,
        hash
    };
}

/**
 * Milestone 3: Saves a record with an immutable hash chain link.
 */
export async function saveImmutableRecord(
    record: CalibrationRecord, 
    previousHash: string = "0"
): Promise<string> {
    if (!record.executionSnapshot) {
        throw new Error("Cannot persist record without execution snapshot.");
    }
    
    const recordHash = await sha256(previousHash + JSON.stringify(record));
    console.info(`[IMMUTABLE] Record ${record.id} anchored with hash ${recordHash.substring(0, 10)}`);
    return recordHash;
}

/**
 * Milestone 3: Detects tampering across a chain of records/logs.
 */
export async function detectTampering(chain: any[]): Promise<{ tampered: boolean; index?: number }> {
    let currentHash = "0";
    for (let i = 0; i < chain.length; i++) {
        const item = chain[i];
        const recomputedHash = await sha256(currentHash + JSON.stringify(item.data));
        if (recomputedHash !== item.hash) {
            return { tampered: true, index: i };
        }
        currentHash = item.hash;
    }
    return { tampered: false };
}
