import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-users";
import { usePolicies } from "@/hooks/use-policies";
import { useMembers, useAddMember } from "@/hooks/use-members";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertFamilyMemberSchema } from "@/types/schema";
import { User, Users, Plus, Calendar, Heart } from "lucide-react";
import { format, differenceInYears } from "date-fns";

export default function FamilyMembers() {
  const { userId } = useAuth();
  const { data: policy } = usePolicies(userId!);
  const { data: members, isLoading } = useMembers(policy?.id || 0);
  const { mutate: addMember, isPending } = useAddMember();

  const form = useForm({
    resolver: zodResolver(insertFamilyMemberSchema.omit({ policy: true })),
    defaultValues: {
      name: "",
      dob: "",
      relation: "spouse"
    }
  });

  const onSubmit = (data: any) => {
    addMember({
      policy: policy!.id,
      name: data.name,
      dob: data.dob,
      relation: data.relation
    });
    form.reset();
  };

  if (!policy) {
    return (
      <Layout>
        <div className="text-center pt-20">
          <h2 className="text-xl font-bold">No Policy Found</h2>
          <p className="text-muted-foreground">Please create a policy first.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Family Members</h1>
          <p className="text-muted-foreground">Manage beneficiaries under your policy</p>
        </div>

        {policy.status === 'approved' && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg shadow-primary/25">
                <Plus className="w-4 h-4" /> Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Family Member</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dob"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="relation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relation</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="self">Self</SelectItem>
                              <SelectItem value="spouse">Spouse</SelectItem>
                              <SelectItem value="child">Child</SelectItem>
                              <SelectItem value="parent">Parent</SelectItem>
                              <SelectItem value="father">Father</SelectItem>
                              <SelectItem value="mother">Mother</SelectItem>
                              <SelectItem value="son">Son</SelectItem>
                              <SelectItem value="daughter">Daughter</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isPending}>
                    {isPending ? "Adding..." : "Add Member"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Always show Self card first */}
        <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Primary Insured
            </CardTitle>
            <User className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">{policy.user?.username || "You"}</div>
            <p className="text-xs text-muted-foreground mt-1">Self • Adult</p>
          </CardContent>
        </Card>

        {(() => {
          const arr = Array.isArray(members)
            ? members
            : (members && Array.isArray(members.results))
              ? members.results
              : (members && Array.isArray(members.family_members))
                ? members.family_members
                : [];
          // Remove duplicates by name, relation, and dob
          const seen = new Set();
          return arr.filter(m => {
            const key = `${m.name}|${m.relation}|${m.dob}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        })().map((member) => (
          <Card key={member.id} className="shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {member.relation}
              </CardTitle>
              {member.is_minor ? (
                <Heart className="h-4 w-4 text-rose-500" />
              ) : (
                <Users className="h-4 w-4 text-blue-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display truncate">{member.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${member.is_minor ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                  {member.is_minor ? 'Minor' : 'Adult'}
                </span>
                <span className="text-xs text-muted-foreground flex items-center">
                  <Calendar className="w-3 h-3 mr-1" /> {member.dob}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Layout>
  );
}
