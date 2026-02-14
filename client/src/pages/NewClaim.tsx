import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-users";
import { usePolicies } from "@/hooks/use-policies";
import { useMembers } from "@/hooks/use-members";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, Check, UploadCloud, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

const documentTypeSchema = z.enum(["hospital_bill", "pharmacy_bill", "aadhaar", "pan", "birth_certificate"]);

const createClaimFormSchema = z.object({
  memberId: z.coerce.number(),
  totalAmount: z.coerce.number().min(1, "Amount must be greater than 0"),
  // Document upload - allow File objects or null
  hospitalBill: z.any().optional(),
  pharmacyBill: z.any().optional(),
  aadhaar: z.any().optional(),
  pan: z.any().optional(),
  birthCert: z.any().optional(),
});

export default function NewClaim() {
  const { userId } = useAuth();
  const { data: policy } = usePolicies(userId!);
  const { data: members } = useMembers(policy?.id || 0);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(createClaimFormSchema),
    defaultValues: {
      memberId: "",
      totalAmount: "",
      hospitalBill: null,
      pharmacyBill: null,
      aadhaar: null,
      pan: null,
      birthCert: null
    }
  });

  const getMembersArray = () => {
    if (Array.isArray(members)) return members;
    if (members && Array.isArray(members.results)) return members.results;
    if (members && Array.isArray(members.family_members)) return members.family_members;
    return [];
  };

  const onMemberChange = (val: string) => {
    form.setValue("memberId", val);
    const arr = getMembersArray();
    console.log('Selected value:', val, 'Members array:', arr);
    const member = arr.find(m => m.id?.toString() === val);
    if (!member) {
      console.warn('No member found for value:', val);
    }
    setSelectedMember(member || null);
  };

  const onSubmit = async (data: any) => {
    if (!policy) return;

    console.log('Submitting claim with data:', data);
    setIsSubmitting(true);

    // Create FormData to send files to Django
    const formData = new FormData();
    formData.append('user_id', userId!);
    formData.append('policy_id', policy.id.toString());
    formData.append('member_id', data.memberId.toString());
    formData.append('total_amount', data.totalAmount.toString());

    // Add files if they exist
    if (data.hospitalBill) {
      formData.append('hospital_bill', data.hospitalBill);
    }
    if (data.pharmacyBill) {
      formData.append('pharmacy_bill', data.pharmacyBill);
    }
    if (data.aadhaar) {
      formData.append('aadhaar', data.aadhaar);
    }
    if (data.pan) {
      formData.append('pan', data.pan);
    }
    if (data.birthCert) {
      formData.append('birth_certificate', data.birthCert);
    }

    try {
      // Send to Django backend - Django will handle Supabase upload and DB save
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('http://localhost:8000/api/claims/', {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Server error:', errorData);
        throw new Error(errorData.detail || 'Failed to submit claim');
      }

      const result = await res.json();
      console.log('Claim submitted successfully:', result);
      // Show success message and redirect
      alert('Claim submitted successfully!');
      window.location.href = '/portal/claims';
    } catch (error) {
      console.error('Claim submission error:', error);
      alert(`Failed to submit claim: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for rendering upload field
  const UploadField = ({ name, label, required = false }: { name: string, label: string, required?: boolean }) => (
    <FormField
      control={form.control}
      name={name as any}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label} {required && <span className="text-red-500">*</span>}</FormLabel>
          <FormControl>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={e => {
                const file = e.target.files?.[0] || null;
                field.onChange(file);
              }}
              className="block w-full border border-slate-200 rounded p-2"
            />
          </FormControl>
          {field.value && typeof field.value === 'object' && (
            <div className="mt-2 text-xs text-emerald-600">{field.value.name}</div>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold">New Claim Request</h1>
          <p className="text-muted-foreground">Submit a new insurance claim for reimbursement.</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="memberId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Patient</FormLabel>
                      <Select onValueChange={onMemberChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select family member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getMembersArray().map((member) => (
                            <SelectItem key={member.id} value={member.id.toString()}>
                              {member.name} ({member.relation})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Claim Amount (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Dynamic Documents Section */}
                {selectedMember && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6 pt-4 border-t"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-lg">Required Documents</h3>
                    </div>

                    {selectedMember.is_minor && (
                      <div className="bg-amber-50 text-amber-800 p-3 rounded-md text-sm flex gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        Additional documents required for minors.
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <UploadField name="hospitalBill" label="Hospital Bill" required />
                      <UploadField name="pharmacyBill" label="Pharmacy Bill" />

                      {/* Conditional Logic based on Minor/Adult */}
                      {selectedMember.is_minor ? (
                        <>
                          <UploadField name="birthCert" label="Birth Certificate" required />
                          <UploadField name="aadhaar" label="Parent's Aadhaar" required />
                          <UploadField name="pan" label="Parent's PAN Card" required />
                        </>
                      ) : (
                        <>
                          <UploadField name="aadhaar" label="Aadhaar Card" required />
                          <UploadField name="pan" label="PAN Card" />
                        </>
                      )}
                    </div>
                  </motion.div>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || !selectedMember}>
                  {isSubmitting ? "Submitting..." : "Submit Claim Request"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
