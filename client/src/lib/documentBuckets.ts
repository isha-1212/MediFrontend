/**
 * Document Bucket Management
 * Handles fetching documents from different Supabase buckets based on document type
 */

import { supabase } from './supabase';

// Bucket mapping for different document types
export const BUCKET_MAPPING = {
    'PAN': 'pan',
    'AADHAAR': 'aadhaar',
    'HOSPITAL_BILL': 'hospital_bills',
    'PHARMACY_BILL': 'pharmacy_bills',
    'POLICY': 'policies',
    'pan': 'pan',
    'aadhaar': 'aadhaar',
    'hospital_bill': 'hospital_bills',
    'pharmacy_bill': 'pharmacy_bills',
    'policy': 'policies',
    'birth_certificate': 'Birth_certificates'
} as const;

export type DocumentType = keyof typeof BUCKET_MAPPING;
export type BucketName = typeof BUCKET_MAPPING[DocumentType];

export interface DocumentInfo {
    document_id: string;
    document_type: string;
    signed_url: string;
    original_filename: string;
    upload_date: string;
    bucket_name: string;
    review_status?: string;
    review_remarks?: string | null;
}

export interface ClaimDocuments {
    claim_id: string;
    claim_status: string;
    total_amount: string;
    submission_date: string;
    documents: DocumentInfo[];
    ml_extraction?: {
        extraction_status: string;
        documents: Record<string, any>;
    } | {
        error: string;
        details: string;
    };
}

/**
 * Get the appropriate bucket name for a document type
 */
export function getBucketName(documentType: string): string {
    return BUCKET_MAPPING[documentType as DocumentType] || 'policies';
}

/**
 * Create a signed URL for a document in a specific bucket
 */
export async function createSignedDocumentUrl(
    bucketName: string,
    filePath: string,
    expiresIn: number = 3600
): Promise<string> {
    try {
        const { data, error } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(filePath, expiresIn);

        if (error) {
            throw new Error(`Failed to create signed URL: ${error.message}`);
        }

        if (!data.signedUrl) {
            throw new Error('No signed URL returned from Supabase');
        }

        return data.signedUrl;
    } catch (error) {
        console.error(`Error creating signed URL for ${bucketName}/${filePath}:`, error);
        throw error;
    }
}

/**
 * Get public URL for a document (for public buckets)
 */
export function getPublicDocumentUrl(bucketName: string, filePath: string): string {
    const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

    return data.publicUrl;
}

/**
 * Download and create blob URL for a document
 * Similar to how policy documents are handled in PolicyDetail.tsx
 */
export async function downloadAndCreateBlobUrl(
    signedUrl: string,
    authToken: string
): Promise<string> {
    if (!signedUrl || signedUrl === 'undefined') {
        throw new Error('Invalid or missing signed URL');
    }

    try {
        const isSupabaseSignedUrl = /^https?:\/\/.*\.supabase\.co\//i.test(signedUrl);
        const response = await fetch(signedUrl, {
            // Supabase signed URLs do not need Authorization headers and may fail CORS if provided.
            headers: isSupabaseSignedUrl ? undefined : {
                'Authorization': `Bearer ${authToken}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch document: ${response.status}`);
        }

        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error('Error downloading document:', error);
        throw error;
    }
}

/**
 * Fetch all documents for a claim from backend (admin review)
 */
export async function fetchClaimDocumentsForReview(
    claimId: string,
    authToken: string
): Promise<ClaimDocuments> {
    try {
        const response = await fetch(
            `/api/admin/claims/${claimId}/review/`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch claim documents: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error fetching claim ${claimId} documents:`, error);
        throw error;
    }
}

/**
 * Process and prepare documents for display
 */
export async function processClaimDocuments(
    claimDocuments: ClaimDocuments,
    authToken: string
): Promise<{
    documents: Array<DocumentInfo & { blobUrl: string }>;
    mlExtraction: any;
}> {
    const processedDocuments: Array<DocumentInfo & { blobUrl: string }> = [];
    for (let i = 0; i < claimDocuments.documents.length; i += 1) {
        const doc = claimDocuments.documents[i];
        if (i === 0 && doc.signed_url) {
            try {
                const blobUrl = await downloadAndCreateBlobUrl(doc.signed_url, authToken);
                processedDocuments.push({ ...doc, blobUrl });
                continue;
            } catch (error) {
                console.error(`Failed to process document ${doc.document_id}:`, error);
            }
        }
        processedDocuments.push({ ...doc, blobUrl: '' });
    }

    return {
        documents: processedDocuments,
        mlExtraction: claimDocuments.ml_extraction
    };
}

/**
 * Trigger ML extraction for a claim and return extracted fields.
 */
export async function triggerClaimExtraction(
    claimId: string,
    authToken: string
): Promise<any> {
    const response = await fetch(
        `/api/admin/claims/${claimId}/extract/`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
        }
    );

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        const details = payload?.details || payload?.error || response.status;
        throw new Error(`Failed to extract claim documents: ${details}`);
    }

    return payload;
}

/**
 * Trigger ML extraction for one specific claim document.
 */
export async function triggerDocumentExtraction(
    claimId: string,
    documentId: string,
    authToken: string
): Promise<any> {
    const response = await fetch(
        `/api/admin/claims/${claimId}/documents/${documentId}/extract/`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
        }
    );

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        const details = payload?.details || payload?.error || response.status;
        throw new Error(`Failed to extract document: ${details}`);
    }

    return payload;
}

export async function reviewDocumentForClaim(
    claimId: string,
    documentId: string,
    status: 'approved' | 'rejected' | 'pending',
    remarks: string,
    authToken: string
): Promise<any> {
    const response = await fetch(
        `/api/admin/claims/${claimId}/documents/${documentId}/review/`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ status, remarks }),
        }
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        const details = payload?.detail || payload?.error || response.status;
        throw new Error(`Failed to review document: ${details}`);
    }
    return payload;
}

/**
 * Get document type display names
 */
export const DOCUMENT_TYPE_NAMES = {
    'hospital_bill': 'Hospital Bill',
    'pharmacy_bill': 'Pharmacy Bill',
    'aadhaar': 'Aadhaar Card',
    'pan': 'PAN Card',
    'birth_certificate': 'Birth Certificate',
    'policy': 'Policy Document',
    'HOSPITAL_BILL': 'Hospital Bill',
    'PHARMACY_BILL': 'Pharmacy Bill',
    'AADHAAR': 'Aadhaar Card',
    'PAN': 'PAN Card',
    'POLICY': 'Policy Document'
} as const;

export function getDocumentTypeName(documentType: string): string {
    return DOCUMENT_TYPE_NAMES[documentType as keyof typeof DOCUMENT_TYPE_NAMES] || documentType;
}
