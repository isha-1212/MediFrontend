import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocation } from "wouter";
import { Eye, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface ClaimRequest {
  claim_id: string;
  user_name: string;
  user_email: string;
  policy_number: string;
  status: string;
  risk_level: string;
  created_at: string;
  documents: any[];
  document_count: number;
}

const getRiskLevelBadge = (riskLevel: string) => {
  switch (riskLevel) {
    case "Low":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "Medium":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "High":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

export default function ClaimProcessing() {
  const [_, setLocation] = useLocation();
  const [claims, setClaims] = useState<ClaimRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Not authenticated');
      }

      // Fetch claims from backend
      const response = await fetch('/api/admin/claims/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch claims: ${response.status}`);
      }

      const data = await response.json();
      setClaims(data.claims || []);

    } catch (err) {
      console.error('Error fetching claims:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch claims';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewClaim = (claimId: string) => {
    setLocation(`/admin/claims/review/${claimId}`);
  };

  const handleRefresh = () => {
    fetchClaims();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-lg">Loading claims...</span>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Claim Processing</h1>
            <p className="text-slate-600">Review incoming claim requests from policy holders.</p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex justify-between items-center">
        <p className="text-slate-600">
          {claims.length === 0
            ? "No claims with uploaded documents found."
            : `Found ${claims.length} claim${claims.length === 1 ? '' : 's'} with uploaded documents.`
          }
        </p>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50">
              <TableHead className="font-semibold text-slate-700">Claim ID</TableHead>
              <TableHead className="font-semibold text-slate-700">User Name</TableHead>
              <TableHead className="font-semibold text-slate-700">Policy Number</TableHead>
              <TableHead className="font-semibold text-slate-700">Documents</TableHead>
              <TableHead className="font-semibold text-slate-700">Risk Level</TableHead>
              <TableHead className="font-semibold text-slate-700">Status</TableHead>
              <TableHead className="text-right font-semibold text-slate-700">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {claims.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  No claims with uploaded documents found. Users need to submit their documents first.
                </TableCell>
              </TableRow>
            ) : (
              claims.map((claim) => (
                <TableRow key={claim.claim_id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-mono font-medium text-slate-900">
                    {claim.claim_id.substring(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-slate-900">{claim.user_name}</div>
                    <div className="text-sm text-slate-500">{claim.user_email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-900">{claim.policy_number}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-blue-600">{claim.document_count} uploaded</div>
                    <div className="text-sm text-slate-500">
                      {claim.documents.map(doc => doc.document_type).join(', ')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`px-3 py-1 font-medium ${getRiskLevelBadge(claim.risk_level)}`}
                    >
                      {claim.risk_level}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {claim.status === 'pending' ? 'Pending Review' : claim.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewClaim(claim.claim_id)}
                      className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View / Process
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Layout>
  );
}
