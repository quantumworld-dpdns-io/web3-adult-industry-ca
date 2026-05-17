"use client"

import { useEffect, useState } from "react"
import { getDashboardMetrics } from "@/lib/api"
import type { DashboardMetrics } from "@/lib/types"
import { StatsCard } from "@/components/StatsCard"
import {
  Shield,
  Fingerprint,
  CheckCircle2,
  Star,
  Loader2,
  RefreshCw,
  Plus,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { toast } from "sonner"

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getDashboardMetrics()
      if (res.data) {
        setMetrics(res.data)
      } else {
        setError("No data received")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load metrics")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [])

  if (error && !metrics) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <p className="text-destructive">{error}</p>
        <button
          onClick={fetchMetrics}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your certification authority
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Credentials"
          value={metrics?.total_credentials ?? 0}
          icon={Shield}
          description="All issued credentials"
          loading={loading}
        />
        <StatsCard
          title="Active DIDs"
          value={metrics?.active_dids ?? 0}
          icon={Fingerprint}
          description="Registered DIDs"
          loading={loading}
        />
        <StatsCard
          title="Verification Rate"
          value={metrics ? `${(metrics.verification_rate * 100).toFixed(1)}%` : "0%"}
          icon={CheckCircle2}
          description="Successful verifications"
          loading={loading}
        />
        <StatsCard
          title="Avg Reputation"
          value={metrics?.average_reputation ?? 0}
          icon={Star}
          description="Across all subjects"
          loading={loading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Credential Issuance Trend</h2>
          {loading ? (
            <div className="h-64 animate-pulse rounded bg-muted" />
          ) : metrics?.issuance_trend && metrics.issuance_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={metrics.issuance_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              No issuance data available yet.
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Recent Activity</h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : metrics?.recent_activity && metrics.recent_activity.length > 0 ? (
            <div className="space-y-3">
              {metrics.recent_activity.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border p-3 text-sm"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    {item.type === "credential_issued" && (
                      <Shield className="h-4 w-4 text-emerald-500" />
                    )}
                    {item.type === "credential_revoked" && (
                      <Shield className="h-4 w-4 text-red-500" />
                    )}
                    {item.type === "did_created" && (
                      <Fingerprint className="h-4 w-4 text-blue-500" />
                    )}
                    {item.type === "webhook_triggered" && (
                      <RefreshCw className="h-4 w-4 text-purple-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => toast.info("Navigate to Credentials page to issue.")}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Issue Credential
          </button>
          <button
            onClick={() => toast.info("Navigate to DIDs page to create.")}
            className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <Plus className="h-4 w-4" />
            Create DID
          </button>
        </div>
      </div>
    </div>
  )
}
