import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "framer-motion";
import {
  FileText,
  Users,
  ClipboardCheck,
  TrendingUp,
  Activity,
  Shield,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  Target
} from "lucide-react";

import { Layout } from "@/components/Layout";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

type InsightCard = {
  total_documents_processed: number;
  total_users: number;
  total_claims: number;
};

type TypeMetric = {
  document_type: string;
  label: string;
  count?: number;
  avg_confidence?: number | null;
};

type InsightsPayload = {
  documents_per_day: Array<{ day: string; count: number }>;
  documents_by_type: TypeMetric[];
  document_distribution: TypeMetric[];
  cards: InsightCard;
  avg_confidence_by_type: TypeMetric[];
  cross_document_matching?: {
    matched: number;
    mismatched: number;
    total_compared: number;
    match_rate: number;
    mismatch_rate: number;
    breakdown: Array<{ status: string; count: number }>;
  };
};

type OverviewPayload = {
  insights: InsightsPayload;
};

const API_BASE = `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api`;
const COLORS = ["#0EA5E9", "#10B981", "#F59E0B", "#6366F1", "#EF4444", "#14B8A6"];
const GRADIENT_COLORS = [
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-violet-500 to-purple-500",
  "from-rose-500 to-pink-500",
  "from-indigo-500 to-blue-500"
];

const REQUIRED_TYPES = ["hospital_bill", "pharmacy_bill", "aadhaar", "pan"];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      duration: 0.3
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

// Custom tooltip components
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg p-3 shadow-lg">
        <p className="font-medium text-slate-900">{`${label}`}</p>
        <p className="text-blue-600">
          {`${payload[0].name}: ${payload[0].value}`}
        </p>
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg p-3 shadow-lg">
        <p className="font-medium text-slate-900">{label}</p>
        <p className="text-violet-600">
          Confidence: {(payload[0].value * 100).toFixed(1)}%
        </p>
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const [insights, setInsights] = useState<InsightsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await fetch(`${API_BASE}/admin/overview/`, { headers });
      if (!response.ok) throw new Error("Failed to load admin insights");
      const data = (await response.json()) as OverviewPayload;
      setInsights(data.insights);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const cards = insights?.cards || {
    total_documents_processed: 0,
    total_users: 0,
    total_claims: 0,
  };

  const byType = useMemo(() => {
    const source = insights?.documents_by_type || [];
    const map = new Map(source.map((x) => [x.document_type, x]));
    return REQUIRED_TYPES.map((key) => {
      const found = map.get(key);
      return {
        document_type: key,
        label: found?.label || key.replace("_", " ").toUpperCase(),
        count: found?.count || 0,
      };
    });
  }, [insights]);

  const confidenceByType = useMemo(() => {
    const source = insights?.avg_confidence_by_type || [];
    const map = new Map(source.map((x) => [x.document_type, x]));
    return REQUIRED_TYPES.map((key) => {
      const found = map.get(key);
      return {
        document_type: key,
        label: found?.label || key.replace("_", " ").toUpperCase(),
        avg_confidence: Number(found?.avg_confidence || 0),
      };
    });
  }, [insights]);

  const crossDocumentMatching = insights?.cross_document_matching || {
    matched: 0,
    mismatched: 0,
    total_compared: 0,
    match_rate: 0,
    mismatch_rate: 0,
    breakdown: [
      { status: "Matched", count: 0 },
      { status: "Mismatched", count: 0 },
    ],
  };

  return (
    <Layout scrollable={false}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="h-full flex flex-col space-y-3"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              Admin Overview
            </h1>
            <p className="text-slate-600 text-sm">
              Document Processing and ML Performance Dashboard
            </p>
            {lastUpdated && (
              <p className="text-xs text-slate-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          <Button
            onClick={() => loadData(true)}
            disabled={refreshing}
            variant="outline"
            className="h-10 gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div variants={itemVariants}>
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <Shield className="h-4 w-4" />
                  <span className="font-medium">Error loading dashboard</span>
                </div>
                <p className="text-red-600 mt-1">{error}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                    <Skeleton className="h-12 w-12 rounded-xl" />
                  </div>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-4 w-40 mb-4" />
                  <Skeleton className="h-60 w-full" />
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Main Dashboard Content */}
        {!loading && !error && insights && (
          <>
            {/* Stats Cards */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <StatCard
                label="Total Documents Processed"
                value={cards.total_documents_processed}
                icon={FileText}
                trend="+12.5%"
                trendUp={true}
                className="bg-gradient-to-br from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 transition-all duration-300"
              />
              <StatCard
                label="Total Users"
                value={cards.total_users}
                icon={Users}
                trend="+8.2%"
                trendUp={true}
                className="bg-gradient-to-br from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 transition-all duration-300"
              />
              <StatCard
                label="Total Claims"
                value={cards.total_claims}
                icon={ClipboardCheck}
                trend="+15.3%"
                trendUp={true}
                className="bg-gradient-to-br from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100 transition-all duration-300"
              />
            </motion.div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0">
              {/* Documents Per Day Chart */}
              <motion.div variants={itemVariants}>
                <Card className="hover:shadow-lg transition-all duration-300">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                      </div>
                      <CardTitle className="text-lg">Documents Per Day</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={insights?.documents_per_day || []}>
                          <defs>
                            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0.1} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis
                            dataKey="day"
                            tick={{ fontSize: 12 }}
                            stroke="#64748b"
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: 12 }}
                            stroke="#64748b"
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Line
                            type="monotone"
                            dataKey="count"
                            stroke="#0EA5E9"
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#0EA5E9', strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 6, fill: '#0EA5E9' }}
                            fill="url(#colorGradient)"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Distribution By Type */}
              <motion.div variants={itemVariants}>
                <Card className="hover:shadow-lg transition-all duration-300">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <PieChartIcon className="h-4 w-4 text-emerald-600" />
                      </div>
                      <CardTitle className="text-lg">Distribution By Type</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={byType}
                            dataKey="count"
                            nameKey="label"
                            outerRadius={80}
                            innerRadius={40}
                            paddingAngle={2}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {byType.map((entry, index) => (
                              <Cell
                                key={`${entry.document_type}-${index}`}
                                fill={COLORS[index % COLORS.length]}
                                stroke="#fff"
                                strokeWidth={2}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* ML Confidence Chart */}
              <motion.div variants={itemVariants}>
                <Card className="hover:shadow-lg transition-all duration-300">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-violet-100 rounded-lg">
                        <BarChart3 className="h-4 w-4 text-violet-600" />
                      </div>
                      <CardTitle className="text-lg">ML Confidence By Type</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={confidenceByType}>
                          <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.9} />
                              <stop offset="95%" stopColor="#6366F1" stopOpacity={0.6} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 12 }}
                            stroke="#64748b"
                          />
                          <YAxis
                            domain={[0, 1]}
                            tick={{ fontSize: 12 }}
                            stroke="#64748b"
                          />
                          <Tooltip content={<CustomBarTooltip />} />
                          <Bar
                            dataKey="avg_confidence"
                            fill="url(#barGradient)"
                            radius={[8, 8, 0, 0]}
                            stroke="#6366F1"
                            strokeWidth={1}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Cross-Document Matching */}
              <motion.div variants={itemVariants}>
                <Card className="hover:shadow-lg transition-all duration-300">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Target className="h-4 w-4 text-amber-600" />
                      </div>
                      <CardTitle className="text-lg">Cross-Document Name Matching</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32 mb-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={crossDocumentMatching.breakdown}
                            dataKey="count"
                            nameKey="status"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            stroke="#fff"
                            strokeWidth={2}
                          >
                            <Cell fill="#10B981" />
                            <Cell fill="#EF4444" />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-gradient-to-r from-emerald-50 to-emerald-100 p-3 text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                          <span className="text-sm font-medium text-emerald-800">Matched</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-900">{crossDocumentMatching.match_rate}%</p>
                        <Badge variant="secondary" className="mt-1 text-xs bg-emerald-200 text-emerald-800">
                          {crossDocumentMatching.matched} docs
                        </Badge>
                      </div>
                      <div className="rounded-lg bg-gradient-to-r from-red-50 to-red-100 p-3 text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-sm font-medium text-red-800">Mismatched</span>
                        </div>
                        <p className="text-2xl font-bold text-red-900">{crossDocumentMatching.mismatch_rate}%</p>
                        <Badge variant="secondary" className="mt-1 text-xs bg-red-200 text-red-800">
                          {crossDocumentMatching.mismatched} docs
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </>
        )}
      </motion.div>
    </Layout>
  );
}
