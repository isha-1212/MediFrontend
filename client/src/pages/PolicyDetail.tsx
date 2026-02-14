import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/types/routes";
import { supabase } from "@/lib/supabase";
import { apiClient } from "@/lib/api-client";
import { useUpdatePolicyStatus } from "@/hooks/use-policies";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, FileText, X } from "lucide-react";
import { format } from "date-fns";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function PolicyDetail() {
    const [, params] = useRoute("/admin/policies/:id");
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const { mutate: updateStatus, isPending } = useUpdatePolicyStatus();

    const policyId = params?.id ? Number(params.id) : NaN;

    const [docUrl, setDocUrl] = useState<string | null>(null);
    const [docError, setDocError] = useState<string | null>(null);
    const [viewerError, setViewerError] = useState<string | null>(null);

    const [action, setAction] = useState<"approved" | "rejected" | null>(null);
    const [reason, setReason] = useState("");

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingDecision, setPendingDecision] = useState<"approved" | "rejected" | null>(null);

    const { data: policy, isLoading } = useQuery({
        queryKey: ["policy-detail", policyId],
        enabled: Number.isFinite(policyId),
        queryFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) {
                throw new Error("Not authenticated");
            }

            const res = await fetch(api.policies.getById(String(policyId)), {
                method: "GET",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                throw new Error("Failed to fetch policy details");
            }

            return res.json();
        },
    });

    useEffect(() => {
        const loadDocument = async () => {
            if (!policy || !policy.has_document) return;
            try {
                const result = await apiClient.getPolicyDocument(policy.id);
                console.log('Document result:', result);

                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;

                if (!token) {
                    throw new Error('Not authenticated');
                }

                const response = await fetch(result.signed_url, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch document: ${response.status}`);
                }

                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                setDocUrl(blobUrl);
                setDocError(null);
                setViewerError(null);
            } catch (err: any) {
                console.error('Document load error:', err);
                setDocError("We couldn't load this document. Please try again.");
                setViewerError("We couldn't load this document. Please try again.");
            }
        };

        loadDocument();

        // Cleanup blob URL on unmount
        return () => {
            if (docUrl && docUrl.startsWith('blob:')) {
                URL.revokeObjectURL(docUrl);
            }
        };
    }, [policy]);

    const openConfirm = (decision: "approved" | "rejected") => {
        if (decision === "rejected" && !reason.trim()) {
            toast({
                title: "Rejection reason required",
                description: "Please provide a reason for rejection.",
                variant: "destructive",
            });
            return;
        }
        setPendingDecision(decision);
        setConfirmOpen(true);
    };

    const handleConfirmDecision = () => {
        if (!pendingDecision) return;

        if (pendingDecision === "approved") {
            updateStatus(
                { id: policyId, status: "approved" },
                {
                    onSuccess: () => {
                        setConfirmOpen(false);
                        setLocation("/admin/policies");
                    },
                }
            );
        } else {
            updateStatus(
                { id: policyId, status: "rejected", rejectionReason: reason },
                {
                    onSuccess: () => {
                        setConfirmOpen(false);
                        setLocation("/admin/policies");
                    },
                }
            );
        }
    };

    if (!Number.isFinite(policyId)) {
        return (
            <Layout>
                <div className="pt-20 text-center">Invalid policy ID.</div>
            </Layout>
        );
    }

    if (isLoading || !policy) {
        return (
            <Layout>
                <div className="pt-20 text-center">Loading policy details...</div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="mb-4 flex items-center justify-between">
                <Button
                    variant="ghost"
                    onClick={() => setLocation("/admin/policies")}
                    className="gap-2"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to policies
                </Button>
            </div>

            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-bold">Policy Detail</h1>
                    <p className="text-sm text-muted-foreground">
                        User ID: <span className="font-mono">{policy.user_id}</span> ·
                        {" "}
                        Policy Number: <span className="font-mono">{policy.policy_number}</span>
                    </p>
                </div>
                <StatusBadge status={policy.status} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
                {/* Left: Document preview */}
                <div className="bg-white rounded-xl border shadow-sm p-4 lg:p-6 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                Uploaded Policy Document
                            </p>
                            <p className="text-xs text-muted-foreground">View the file provided by the user</p>
                        </div>
                    </div>
                    <div className="relative flex-1 rounded-lg border bg-slate-50 overflow-hidden flex items-center justify-center">
                        {docUrl && !docError && !viewerError && (
                            <iframe
                                src={docUrl}
                                title="Policy document"
                                className="w-full h-[420px] lg:h-full bg-white"
                                onError={() => setViewerError("We couldn't display this document.")}
                            />
                        )}

                        {(!policy.has_document || docError || viewerError || !docUrl) && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                                <div className="mb-4 rounded-full bg-slate-100 p-3">
                                    <FileText className="w-6 h-6 text-slate-500" />
                                </div>
                                <p className="text-sm font-medium text-slate-900">
                                    {policy.has_document
                                        ? "We couldn't display this document"
                                        : "No policy document uploaded"}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                                    {policy.has_document
                                        ? "The file may be missing or temporarily unavailable. You can try again or ask the user to re-upload."
                                        : "The user has not uploaded their policy document yet."}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Details and actions */}
                <div className="bg-white rounded-xl border shadow-sm p-4 lg:p-6 flex flex-col">
                    <div className="space-y-3 mb-4">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase">User</p>
                            <p className="font-medium">{policy.user_name || policy.user_email}</p>
                            <p className="text-xs text-muted-foreground">ID: {policy.user_id}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase">Start Date</p>
                                <p className="font-mono text-sm">
                                    {(() => {
                                        try {
                                            const d = new Date(policy.start_date);
                                            if (isNaN(d.getTime())) return policy.start_date;
                                            return format(d, "dd MMMM yyyy");
                                        } catch {
                                            return policy.start_date;
                                        }
                                    })()}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase">End Date</p>
                                <p className="font-mono text-sm">
                                    {(() => {
                                        try {
                                            const d = new Date(policy.end_date);
                                            if (isNaN(d.getTime())) return policy.end_date;
                                            return format(d, "dd MMMM yyyy");
                                        } catch {
                                            return policy.end_date;
                                        }
                                    })()}
                                </p>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase">Policy Number</p>
                            <p className="font-mono text-sm">{policy.policy_number}</p>
                        </div>
                        {Array.isArray(policy.family_members) && policy.family_members.length > 0 && (
                            <div className="mt-3">
                                <p className="text-xs text-muted-foreground uppercase mb-1">Family Members</p>
                                <div className="space-y-1 text-sm">
                                    {policy.family_members.map((member: any) => (
                                        <div key={member.id} className="flex items-center justify-between border rounded px-2 py-1">
                                            <span>{member.name} ({member.relation})</span>
                                            {member.dob && (
                                                <span className="text-xs text-muted-foreground">DOB: {member.dob}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {action === "rejected" && (
                        <div className="mb-4">
                            <p className="text-xs text-muted-foreground mb-1">Rejection Remarks</p>
                            <Textarea
                                placeholder="Enter reason for rejection..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="min-h-[100px]"
                            />
                        </div>
                    )}

                    <div className="mt-auto flex justify-end gap-3">
                        {action !== "rejected" ? (
                            <>
                                <Button
                                    variant="outline"
                                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                    onClick={() => setAction("rejected")}
                                    disabled={isPending}
                                >
                                    <X className="w-4 h-4 mr-2" /> Reject
                                </Button>
                                <Button
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={() => openConfirm("approved")}
                                    disabled={isPending}
                                >
                                    <Check className="w-4 h-4 mr-2" /> Approve
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="ghost"
                                    onClick={() => setAction(null)}
                                    disabled={isPending}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="bg-rose-600 hover:bg-rose-700 text-white"
                                    onClick={() => openConfirm("rejected")}
                                    disabled={isPending}
                                >
                                    Confirm Rejection
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {pendingDecision === "approved"
                                ? "Approve this policy?"
                                : "Reject this policy?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingDecision === "approved"
                                ? "This will mark the policy as approved and allow the user to proceed with claims."
                                : "This will mark the policy as rejected. The user will see your remarks on their dashboard."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDecision}
                            disabled={isPending}
                        >
                            {pendingDecision === "approved" ? "Yes, approve" : "Yes, reject"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Layout>
    );
}
