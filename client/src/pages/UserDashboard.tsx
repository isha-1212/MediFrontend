import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-users";
import { usePolicies } from "@/hooks/use-policies";
import { useUserClaims } from "@/hooks/use-claims";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, Plus, ShieldAlert, Clock, AlertTriangle, Upload, X } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

const policyUploadSchema = z.object({
  policy_number: z.string().min(1, "Policy number is required"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
});

export default function UserDashboard() {
  const [location] = useLocation();
  const { userId } = useAuth();
  const { data: policy, isLoading: policyLoading } = usePolicies(userId!);
  const { data: claims, isLoading: claimsLoading } = useUserClaims(userId!);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string>("");
  const [uploadingKey, setUploadingKey] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    resolver: zodResolver(policyUploadSchema),
    defaultValues: {
      policy_number: "",
      start_date: format(new Date(), "yyyy-MM-dd"),
      end_date: format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), "yyyy-MM-dd"),
    }
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or image file (JPG, PNG)",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setUploadedFile(file);
  };

  const removeFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: z.infer<typeof policyUploadSchema>) => {
    if (!uploadedFile) {
      toast({
        title: "No file selected",
        description: "Please upload a policy document",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("Not authenticated");
      }

      const formData = new FormData();
      formData.append("file", uploadedFile);
      formData.append("policy_number", data.policy_number);
      formData.append("start_date", data.start_date);
      formData.append("end_date", data.end_date);

      const response = await fetch("http://localhost:8000/api/upload-policy-document/", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || "Upload failed");
      }

      const result = await response.json();

      toast({ title: "Success!", description: result.message || "Policy registered successfully" });

      queryClient.invalidateQueries({ queryKey: ["user-policy"] });
      setDialogOpen(false);
      form.reset();
      setUploadedFile(null);
    } catch (error: any) {
      toast({
        title: "Submission failed",
        description: error.message || "Failed to register policy",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (policyLoading || claimsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full pt-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!policy) {
    return (
      <Layout>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto text-center pt-20"
        >
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
            <ShieldAlert className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-4">No Active Policy Found</h1>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">
            Please register your health insurance policy to manage family members and submit claims.
          </p>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="rounded-full px-8 shadow-lg shadow-primary/25">
                <Plus className="w-4 h-4 mr-2" />
                Register Policy
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register New Policy</DialogTitle>
                <DialogDescription>
                  Enter your policy details and upload the policy document.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="policy_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Policy Number</FormLabel>
                        <FormControl>
                          <Input placeholder="POL-123456789" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="end_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <FormLabel>Policy Document (PDF/Image)</FormLabel>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer block"
                    >
                      {uploadedFile ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-8 h-8 text-green-500" />
                            <div className="text-left">
                              <p className="text-sm font-medium text-slate-700">{uploadedFile.name}</p>
                              <p className="text-xs text-slate-400">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                            </div>
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={(e) => { e.preventDefault(); removeFile(); }}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-sm text-slate-500">Click to upload or drag and drop</p>
                          <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG (max 5MB)</p>
                        </>
                      )}
                    </label>
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting || !uploadedFile}>
                    {isSubmitting ? "Submitting..." : "Submit Policy"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </motion.div>
      </Layout>
    );
  }

  const isPending = policy.status === "pending";
  const isRejected = policy.status === "rejected";
  const isMyClaimsPage = location === "/portal/claims";

  const allClaims: any[] = claims || [];
  const totalClaims = allClaims.length;
  const totalPendingClaims = allClaims.filter((c) => String(c.status || "").toLowerCase() === "pending").length;
  const totalApprovedAmount = allClaims
    .filter((c) => String(c.status || "").toLowerCase() === "approved")
    .reduce((sum, c) => sum + (Number(c.totalAmount) || 0), 0);
  const recentClaims = allClaims.slice(0, 5);

  const formatDocumentType = (value: string) => {
    const map: Record<string, string> = {
      hospital_bill: "Hospital Bill",
      pharmacy_bill: "Pharmacy Bill",
      aadhaar: "Aadhaar",
      pan: "PAN",
      birth_certificate: "Birth Certificate",
    };
    return map[value] || value;
  };

  const resolveViewUrl = (rawUrl?: string) => {
    if (!rawUrl) return "#";
    if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) return rawUrl;
    return `http://localhost:8000${rawUrl}`;
  };

  const openDocumentViewer = (rawUrl?: string) => {
    const url = resolveViewUrl(rawUrl);
    if (!url || url === "#") return;
    setViewerUrl(url);
    setViewerOpen(true);
  };

  const handleReuploadFileChange = async (
    claimId: string,
    documentType: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const currentKey = `${claimId}:${documentType}`;
    setUploadingKey(currentKey);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append(documentType, file);

      const response = await fetch(`http://localhost:8000/api/claims/${claimId}/reupload/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to reupload document");
      }

      toast({
        title: "Reuploaded",
        description: `${formatDocumentType(documentType)} replaced in existing claim.`,
      });
      queryClient.invalidateQueries();
    } catch (error: any) {
      toast({
        title: "Reupload failed",
        description: error?.message || "Could not upload file",
        variant: "destructive",
      });
    } finally {
      setUploadingKey("");
      event.target.value = "";
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">{isMyClaimsPage ? "My Claims" : "Dashboard"}</h1>
          <p className="text-slate-500">{isMyClaimsPage ? "Track claim status and document updates." : "Manage your health insurance and claims."}</p>
        </div>

        {!isMyClaimsPage && (
          <Card className="border-none shadow-lg overflow-hidden relative">
            <div className={`absolute top-0 left-0 w-2 h-full ${isPending ? "bg-amber-500" : isRejected ? "bg-rose-500" : "bg-emerald-500"}`} />
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Policy #{policy.policyNumber}</CardTitle>
                  <CardDescription className="mt-1">Valid: {policy.startDate} to {policy.endDate}</CardDescription>
                </div>
                <StatusBadge status={policy.status} className="text-sm px-3 py-1" />
              </div>
            </CardHeader>
            <CardContent>
              {isPending && (
                <div className="bg-amber-50 text-amber-800 p-4 rounded-lg flex items-start gap-3">
                  <Clock className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">Your policy is currently under review by our administrators. Claim submission and family member management will be enabled once approved.</p>
                </div>
              )}
              {isRejected && (
                <div className="bg-rose-50 text-rose-800 p-4 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Policy Rejected</p>
                    <p className="text-sm mt-1">{policy.rejectionReason || "Please contact support for details."}</p>
                  </div>
                </div>
              )}
              {!isPending && !isRejected && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-2">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Members</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{policy.members?.length || 0}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Claims</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{totalClaims}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Pending Claims</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{totalPendingClaims}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Approved Amount</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">INR {totalApprovedAmount.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center">
                    <Link href="/portal/claims/new">
                      <Button className="w-full h-12 text-lg shadow-lg shadow-primary/20">New Claim Request</Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!isMyClaimsPage ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Recent Claims</h2>
              <Link href="/portal/claims" className="text-sm text-primary font-medium hover:underline">View All</Link>
            </div>

            {recentClaims.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No claims submitted yet</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {recentClaims.map((claim) => (
                  <div key={claim.id} className="bg-white p-4 rounded-xl border border-slate-200 hover:shadow-md transition-shadow flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                        {claim.totalAmount && claim.totalAmount > 0 ? "INR" : "?"}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Claim #{claim.id} - {claim.member?.name || "Policy holder"}</p>
                        <p className="text-sm text-slate-500">Submitted on {claim.submittedDate ? format(new Date(claim.submittedDate), "MMM dd, yyyy") : "N/A"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{claim.totalAmount && claim.totalAmount > 0 ? `INR ${claim.totalAmount}` : "Amount not found"}</p>
                      <StatusBadge status={claim.status} className="mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {allClaims.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No claims submitted yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {allClaims.map((claim) => (
                  <div key={claim.id} className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="font-semibold text-slate-900">Claim #{claim.id}</p>
                    <p className="text-sm text-slate-600">For: {claim.member?.name || "Policy holder"}</p>
                    <p className="text-sm text-slate-600">Status: {claim.status}</p>
                    <p className="text-sm text-slate-600 mb-3">Amount: {claim.totalAmount && claim.totalAmount > 0 ? `INR ${claim.totalAmount}` : "Amount not found"}</p>

                    <div className="border-t border-slate-200 pt-3">
                      <p className="text-sm font-semibold text-slate-900 mb-2">Documents</p>
                      {!claim.documents || claim.documents.length === 0 ? (
                        <p className="text-sm text-slate-500">No documents found</p>
                      ) : (
                        <div className="space-y-2">
                          {claim.documents.map((doc: any) => (
                            <div key={doc.documentId}>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-800">{formatDocumentType(doc.documentType)}</span>
                                <span className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    className="text-primary hover:underline"
                                    onClick={() => openDocumentViewer(doc.viewUrl)}
                                  >
                                    View
                                  </button>
                                  <input
                                    id={`reupload-${claim.id}-${doc.documentType}`}
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="hidden"
                                    onChange={(e) => handleReuploadFileChange(claim.id, doc.documentType, e)}
                                  />
                                  <button
                                    type="button"
                                    className="text-primary hover:underline disabled:opacity-60"
                                    disabled={uploadingKey === `${claim.id}:${doc.documentType}`}
                                    onClick={() => {
                                      const input = document.getElementById(`reupload-${claim.id}-${doc.documentType}`) as HTMLInputElement | null;
                                      input?.click();
                                    }}
                                  >
                                    {uploadingKey === `${claim.id}:${doc.documentType}` ? "Uploading..." : "Reupload"}
                                  </button>
                                  <span className="text-slate-600">Status: {doc.status}</span>
                                </span>
                              </div>
                              {doc.remarks ? (
                                <div className="text-xs text-slate-500 ml-1">Remarks: {doc.remarks}</div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-5xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>Uploaded Document</DialogTitle>
            <DialogDescription>Preview</DialogDescription>
          </DialogHeader>
          <div className="w-full h-[75vh] border border-slate-200 rounded-md overflow-hidden">
            {viewerUrl ? (
              <iframe
                src={viewerUrl}
                title="Uploaded Document"
                className="w-full h-full"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
