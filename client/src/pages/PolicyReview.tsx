import { Layout } from "@/components/Layout";
import { usePolicies } from "@/hooks/use-policies";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye } from "lucide-react";
import { Link } from "wouter";
import { format, isToday, isYesterday } from "date-fns";

export default function PolicyReview() {
  const { data: policies, isLoading } = usePolicies(); // Fetch all for admin

  if (isLoading) return <Layout><div className="pt-20 text-center">Loading policies...</div></Layout>;

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">Policy Review</h1>
        <p className="text-muted-foreground">AI-assisted verification of user policies.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request ID</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Policy Number (last 4)</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies?.map((policy: any) => (
              <TableRow key={policy.id} className="hover:bg-slate-50/50">
                <TableCell className="font-mono text-xs">{policy.id}</TableCell>
                <TableCell className="font-medium">{policy.user_email}</TableCell>
                <TableCell className="font-mono text-xs">
                  ****{String(policy.policy_number).slice(-4)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {(() => {
                    try {
                      const d = new Date(policy.created_at);
                      if (isNaN(d.getTime())) return policy.created_at;

                      const timePart = format(d, "h:mm a");
                      if (isToday(d)) return `Today, ${timePart}`;
                      if (isYesterday(d)) return `Yesterday, ${timePart}`;

                      return format(d, "dd MMM, h:mm a");
                    } catch {
                      return policy.created_at;
                    }
                  })()}
                </TableCell>
                <TableCell><StatusBadge status={policy.status} /></TableCell>
                <TableCell className="text-right">
                  <Link href={`/admin/policies/${policy.id}`}>
                    <Button asChild variant="outline" size="sm">
                      <span>
                        <Eye className="w-3 h-3 mr-2" /> Review
                      </span>
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Layout>
  );
}
