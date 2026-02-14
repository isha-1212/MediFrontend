import { Layout } from "@/components/Layout";
import { useAdminStats } from "@/hooks/use-claims";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Users, FileCheck, AlertOctagon, TrendingUp, Activity, Shield, FileSearch } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

const data = [
  { name: 'Mon', claims: 4 },
  { name: 'Tue', claims: 7 },
  { name: 'Wed', claims: 3 },
  { name: 'Thu', claims: 8 },
  { name: 'Fri', claims: 5 },
  { name: 'Sat', claims: 2 },
  { name: 'Sun', claims: 1 },
];

export default function AdminDashboard() {
  const { data: stats, isLoading } = useAdminStats();

  if (isLoading || !stats) return <Layout><div className="pt-20 text-center">Loading stats...</div></Layout>;

  return (
    <Layout>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Admin Overview</h1>
            <p className="text-muted-foreground">Platform statistics and activity monitoring.</p>
          </div>
          <Button
            onClick={() => window.location.href = '/admin/claims/process'}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <FileSearch className="w-4 h-4 mr-2" />
            Claim Processing Demo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Total Users"
          value={stats.totalUsers}
          icon={Users}
          trend="+12%"
          trendUp={true}
        />
        <StatCard
          label="Active Policies"
          value={stats.totalPolicies}
          icon={Shield}
          trend="+5%"
          trendUp={true}
        />
        <StatCard
          label="Pending Claims"
          value={stats.pendingClaims}
          icon={AlertOctagon}
          className="border-amber-200 bg-amber-50/50"
        />
        <StatCard
          label="Total Claims"
          value={stats.totalClaims}
          icon={FileCheck}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-card rounded-2xl border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg">Weekly Claim Volume</h3>
            <div className="p-2 bg-slate-100 rounded-lg">
              <TrendingUp className="w-4 h-4 text-slate-500" />
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} tickMargin={10} />
                <YAxis axisLine={false} tickLine={false} fontSize={12} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="claims" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 3 ? 'hsl(var(--primary))' : 'hsl(var(--primary)/0.3)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions / Recent Activity Placeholder */}
        <div className="bg-card rounded-2xl border p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-6">System Health</h3>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="flex-1 text-sm font-medium">ML Engine Status</span>
              <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded">Operational</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="flex-1 text-sm font-medium">OCR Processor</span>
              <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded">Operational</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="flex-1 text-sm font-medium">Database</span>
              <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded">Healthy</span>
            </div>

            <div className="mt-8 pt-6 border-t">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Claim Breakdown</p>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm">Approved</span>
                <span className="text-sm font-bold text-emerald-600">{stats.approvedClaims}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full mb-4 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(stats.approvedClaims / (stats.totalClaims || 1)) * 100}%` }}></div>
              </div>

              <div className="flex justify-between items-center mb-2">
                <span className="text-sm">Rejected</span>
                <span className="text-sm font-bold text-rose-600">{stats.rejectedClaims}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(stats.rejectedClaims / (stats.totalClaims || 1)) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
