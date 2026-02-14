/**
 * Admin Claim Review Component
 * Allows admin to review claims and view ML extracted data from all documents
 */

import React, { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import {
    fetchClaimDocumentsForReview,
    triggerDocumentExtraction,
    reviewDocumentForClaim,
    processClaimDocuments,
    downloadAndCreateBlobUrl,
    getDocumentTypeName,
    type ClaimDocuments,
    type DocumentInfo
} from '../lib/documentBuckets';

interface ProcessedDocument extends DocumentInfo {
    blobUrl: string;
}

interface MLExtractionField {
    field_name: string;
    value: string;
    confidence: number;
}

const AdminClaimReview: React.FC = () => {
    const [, params] = useRoute("/admin/claims/review/:claimId");
    const [, setLocation] = useLocation();
    
    const claimId = params?.claimId;

    const [claimData, setClaimData] = useState<ClaimDocuments | null>(null);
    const [processedDocuments, setProcessedDocuments] = useState<ProcessedDocument[]>([]);
    const [mlExtractionData, setMlExtractionData] = useState<any>(null);
    const [extractionByDocId, setExtractionByDocId] = useState<Record<string, MLExtractionField[]>>({});
    const [extractionOrder, setExtractionOrder] = useState<string[]>([]);
    const [extractingDocId, setExtractingDocId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDocument, setSelectedDocument] = useState<ProcessedDocument | null>(null);
    const [docLoadingId, setDocLoadingId] = useState<string | null>(null);
    const [reviewRemarks, setReviewRemarks] = useState<string>("");
    const [reviewSaving, setReviewSaving] = useState(false);
    const [showRejectRemarks, setShowRejectRemarks] = useState(false);
    const isNoOcrDocument = (documentType?: string) => documentType === 'birth_certificate';

    useEffect(() => {
        if (!claimId) {
            setError('No claim ID provided');
            setLoading(false);
            return;
        }

        loadClaimDocuments();
    }, [claimId]);

    const loadClaimDocuments = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get current session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
                throw new Error('Not authenticated');
            }

            // Fetch claim documents and preview metadata
            console.log(`Fetching documents for claim ${claimId}...`);
            const claimDocuments = await fetchClaimDocumentsForReview(claimId!, session.access_token);

            setClaimData(claimDocuments);

            // Process documents to create blob URLs
            console.log('Processing documents...');
            const { documents } = await processClaimDocuments(
                claimDocuments,
                session.access_token
            );

            setProcessedDocuments(documents);
            // Do not preload any extraction on page open.
            setMlExtractionData(null);
            setExtractionByDocId({});
            setExtractionOrder([]);

            // Select first document by default
            if (documents.length > 0) {
                setSelectedDocument(documents[0]);
            }

        } catch (err) {
            console.error('Error loading claim documents:', err);
            setError(err instanceof Error ? err.message : 'Failed to load claim documents');
        } finally {
            setLoading(false);
        }
    };

    const renderDocumentPreview = (doc: ProcessedDocument) => {
        if (!doc.blobUrl) {
            return (
                <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
                    <p className="text-gray-500">
                        {docLoadingId === doc.document_id ? 'Loading document...' : 'Document preview not available'}
                    </p>
                </div>
            );
        }

        return (
            <div className="h-96 bg-white rounded-lg shadow-sm overflow-hidden">
                <img
                    src={doc.blobUrl}
                    alt={doc.original_filename}
                    className="w-full h-full object-contain"
                />
            </div>
        );
    };

    const renderMLExtractionResults = (documentType: string, extractionData?: MLExtractionField[]) => {
        if (isNoOcrDocument(documentType)) {
            return null;
        }

        if (Array.isArray(extractionData) && extractionData.length === 0) {
            return null;
        }

        if (!extractionData) {
            return (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-700">No extraction data for {getDocumentTypeName(documentType)}</p>
                </div>
            );
        }

        return (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-blue-800 mb-3">
                    ML Extraction Results - {getDocumentTypeName(documentType)}
                </h4>
                <div className="space-y-2">
                    {Array.isArray(extractionData) ? (
                        extractionData.map((field: MLExtractionField, index) => (
                            <div key={index} className="flex justify-between items-center py-2 border-b border-blue-200 last:border-b-0">
                                <span className="font-medium text-blue-700">{field.field_name}:</span>
                                <div className="text-right">
                                    <div className="text-blue-900">{field.value}</div>
                                    <div className="text-sm text-blue-600">
                                        Confidence: {(field.confidence * 100).toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-blue-900">{JSON.stringify(extractionData, null, 2)}</div>
                    )}
                </div>
            </div>
        );
    };

    const renderErrorState = () => (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
                <div className="text-red-600 text-center">
                    <h2 className="text-xl font-semibold mb-2">Error</h2>
                    <p>{error}</p>
                    <button
                        onClick={() => setLocation('/admin')}
                        className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                        Back to Admin Panel
                    </button>
                </div>
            </div>
        </div>
    );

    const renderLoadingState = () => (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading claim documents and running ML extraction...</p>
                </div>
            </div>
        </div>
    );

    const handleSelectDocument = async (doc: ProcessedDocument) => {
        setSelectedDocument(doc);
        setReviewRemarks((doc as any).review_remarks || "");
        setShowRejectRemarks(false);
        if (!doc.blobUrl && doc.signed_url) {
            try {
                setDocLoadingId(doc.document_id);
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                if (!token) {
                    throw new Error('Not authenticated');
                }
                const blobUrl = await downloadAndCreateBlobUrl(doc.signed_url, token);
                setProcessedDocuments((prev) =>
                    prev.map((d) => d.document_id === doc.document_id ? { ...d, blobUrl } : d)
                );
                setSelectedDocument((prev) => prev && prev.document_id === doc.document_id ? { ...prev, blobUrl } : prev);
            } catch (err) {
                console.error('Error loading document preview:', err);
            } finally {
                setDocLoadingId(null);
            }
        }

        // Birth certificate: do not run extraction and do not show extraction UI.
        if (isNoOcrDocument(doc.document_type)) {
            setExtractingDocId(null);
            setExtractionByDocId((prev) => {
                const next = { ...prev };
                delete next[doc.document_id];
                return next;
            });
            setExtractionOrder((prev) => prev.filter((id) => id !== doc.document_id));
            return;
        }

        // Run ML only for clicked document.
        try {
            setExtractingDocId(doc.document_id);
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token || !claimId) {
                throw new Error('Not authenticated');
            }

            const result = await triggerDocumentExtraction(claimId, doc.document_id, token);
            const fields: MLExtractionField[] = Array.isArray(result?.fields) ? result.fields : [];

            setExtractionByDocId((prev) => ({
                ...prev,
                [doc.document_id]: fields
            }));
            setExtractionOrder((prev) => (prev.includes(doc.document_id) ? prev : [...prev, doc.document_id]));
            setMlExtractionData((prev: any) => ({
                ...(prev || {}),
                extraction_status: result?.extraction_status || 'completed',
            }));
        } catch (extractionErr) {
            console.error('Error triggering document extraction:', extractionErr);
            const errorField: MLExtractionField[] = [{
                field_name: 'extraction_error',
                value: extractionErr instanceof Error ? extractionErr.message : 'Extraction failed',
                confidence: 0.0
            }];
            setExtractionByDocId((prev) => ({
                ...prev,
                [doc.document_id]: errorField
            }));
            setExtractionOrder((prev) => (prev.includes(doc.document_id) ? prev : [...prev, doc.document_id]));
            setMlExtractionData((prev: any) => ({
                ...(prev || {}),
                extraction_status: 'error',
            }));
        } finally {
            setExtractingDocId(null);
        }
    };

    const handleDocumentReview = async (status: 'approved' | 'rejected', remarksOverride?: string) => {
        if (!claimId || !selectedDocument) return;
        try {
            const remarksToSend = status === 'rejected' ? String(remarksOverride ?? reviewRemarks ?? '').trim() : '';
            if (status === 'rejected' && !remarksToSend) {
                alert('Please add remarks before rejecting.');
                return;
            }
            setReviewSaving(true);
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error('Not authenticated');

            const result = await reviewDocumentForClaim(
                claimId,
                selectedDocument.document_id,
                status,
                remarksToSend,
                token
            );

            setProcessedDocuments((prev) =>
                prev.map((d) =>
                    d.document_id === selectedDocument.document_id
                        ? { ...d, review_status: result.review_status, review_remarks: result.review_remarks }
                        : d
                )
            );
            setSelectedDocument((prev) =>
                prev ? { ...prev, review_status: result.review_status, review_remarks: result.review_remarks } : prev
            );
            setClaimData((prev) => (prev ? { ...prev, claim_status: result.claim_status } : prev));
            setShowRejectRemarks(false);
        } catch (err) {
            console.error('Error reviewing document:', err);
            alert(err instanceof Error ? err.message : 'Failed to save review');
        } finally {
            setReviewSaving(false);
        }
    };

    if (loading) return renderLoadingState();
    if (error) return renderErrorState();
    if (!claimData) return renderErrorState();

    const visibleExtractionOrder = extractionOrder.filter((docId) => {
        const d = processedDocuments.find((x) => x.document_id === docId);
        return d && !isNoOcrDocument(d.document_type);
    });
    const shouldShowExtractionSections = !isNoOcrDocument(selectedDocument?.document_type);

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Claim Review</h1>
                            <p className="text-gray-600 mt-1">
                                Claim ID: {claimData.claim_id} | Status: {claimData.claim_status} |
                                Amount: ₹{claimData.total_amount}
                            </p>
                        </div>
                        <button
                            onClick={() => setLocation('/admin')}
                            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                        >
                            Back to Admin
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Document List */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents</h3>
                            <div className="space-y-3">
                                {processedDocuments.map((doc) => (
                                    <button
                                        key={doc.document_id}
                                        onClick={() => handleSelectDocument(doc)}
                                        className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedDocument?.document_id === doc.document_id
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="font-medium text-gray-900">
                                            {getDocumentTypeName(doc.document_type)}
                                        </div>
                                        <div className="text-sm text-gray-600 mt-1">
                                            {doc.original_filename}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            Bucket: {doc.bucket_name}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Document Preview and Extraction Results */}
                    <div className="lg:col-span-2 space-y-6">
                        {selectedDocument && (
                            <>
                                {/* Document Preview */}
                                <div className="bg-white rounded-lg shadow-sm p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                        {getDocumentTypeName(selectedDocument.document_type)} Preview
                                    </h3>
                                    {renderDocumentPreview(selectedDocument)}
                                    <div className="mt-4 border-t pt-4">
                                        <div className="text-sm text-gray-700 mb-2">
                                            Current Status: <strong>{(selectedDocument as any).review_status || 'pending'}</strong>
                                        </div>
                                        <div className="mt-3 flex gap-2">
                                            <button
                                                type="button"
                                                className="bg-emerald-600 text-white px-3 py-2 rounded hover:bg-emerald-700 disabled:opacity-60"
                                                disabled={reviewSaving}
                                                onClick={() => handleDocumentReview('approved', '')}
                                            >
                                                Approve
                                            </button>
                                            <button
                                                type="button"
                                                className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 disabled:opacity-60"
                                                disabled={reviewSaving}
                                                onClick={() => setShowRejectRemarks(true)}
                                            >
                                                Reject
                                            </button>
                                        </div>
                                        {showRejectRemarks && (
                                            <div className="mt-3 border-t pt-3">
                                                <textarea
                                                    className="w-full border border-gray-300 rounded p-2 text-sm"
                                                    rows={3}
                                                    placeholder="Add rejection remarks..."
                                                    value={reviewRemarks}
                                                    onChange={(e) => setReviewRemarks(e.target.value)}
                                                />
                                                <div className="mt-2 flex gap-2">
                                                    <button
                                                        type="button"
                                                        className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 disabled:opacity-60"
                                                        disabled={reviewSaving}
                                                        onClick={() => handleDocumentReview('rejected')}
                                                    >
                                                        Submit Reject
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="bg-gray-600 text-white px-3 py-2 rounded hover:bg-gray-700 disabled:opacity-60"
                                                        disabled={reviewSaving}
                                                        onClick={() => setShowRejectRemarks(false)}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ML Extraction Results */}
                                {shouldShowExtractionSections && (
                                    <div className="bg-white rounded-lg shadow-sm p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">ML Extraction Results</h3>
                                        {extractingDocId && (
                                            <div className="mb-4 text-sm text-blue-700">Running extraction for selected document...</div>
                                        )}
                                        {visibleExtractionOrder.length === 0 ? (
                                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                                <p className="text-gray-700">Select a document to run extraction</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {visibleExtractionOrder.map((docId) => {
                                                    const extractedDoc = processedDocuments.find((d) => d.document_id === docId);
                                                    if (!extractedDoc) return null;
                                                    const content = renderMLExtractionResults(extractedDoc.document_type, extractionByDocId[docId]);
                                                    if (!content) return null;
                                                    return <div key={docId}>{content}</div>;
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* ML Extraction Summary */}
                {shouldShowExtractionSections && (mlExtractionData || visibleExtractionOrder.length > 0) && (
                    <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Extraction Status</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                            {(extractingDocId || mlExtractionData?.extraction_status) ? (
                                <div>
                                    <p><strong>Status:</strong> {extractingDocId ? 'running' : (mlExtractionData?.extraction_status || 'completed')}</p>
                                    <p><strong>Documents Processed:</strong> {visibleExtractionOrder.length}</p>
                                </div>
                            ) : mlExtractionData?.error ? (
                                <div className="text-red-600">
                                    <p><strong>Error:</strong> {mlExtractionData.error}</p>
                                    <p><strong>Details:</strong> {mlExtractionData.details}</p>
                                </div>
                            ) : (
                                <p>ML extraction status unknown</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminClaimReview;
