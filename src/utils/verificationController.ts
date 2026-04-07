import { verifyFullChain } from './signatureService';

/**
 * Public Verification Controller (Audit Readiness)
 * Simulates the backend endpoint called by public QR codes.
 */

export async function handlePublicVerificationRequest(
    documentId: string,
    documentHash: string,
    signatureData: any, // The full DigitalSignature object retrieved from immutable storage
    actualDocumentContent: any // The raw data of the document to be checked
) {
    console.info(`[PUBLIC_VERIFICATION] Request received for document ${documentId}`);

    // Call the hardened verification chain
    const result = await verifyFullChain(actualDocumentContent, signatureData);

    if (!result.valid) {
        return {
            valid: false,
            documentId,
            error: result.reason,
            timestamp: new Date().toISOString()
        };
    }

    return {
        valid: true,
        documentId,
        documentHash,
        signatureValid: true,
        certificateChainValid: true,
        timestampValid: true,
        issuedAt: new Date(signatureData.timestamp).toISOString(),
        signedBy: signatureData.userName,
        role: signatureData.role,
        tsa: signatureData.trustedTimestamp?.timestampAuthority
    };
}
