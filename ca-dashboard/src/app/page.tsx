"use client";

import { useEffect, useState } from "react";
import { getDashboardMetrics } from "@/lib/api";
import type { DashboardMetrics } from "@/lib/types";
import StatsCard from "@/components/StatsCard";
import {
  Fingerprint,
  ShieldCheck,
  Activity,
  Webhook,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboardMetrics()
      .then(setMetrics)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">No data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Overview of your Certification Authority
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total DIDs"
          value={metrics.total_dids}
          icon={Fingerprint}
        />
        <StatsCard
          title="Total Credentials"
          value={metrics.total_credentials}
          icon={ShieldCheck}
        />
        <StatsCard
          title="Verification Rate"
          value={`${(metrics.verification_rate * 100).toFixed(1)}%`}
          icon={Activity}
          trend={{ value: 5, positive: true }}
        />
        <StatsCard
          title="Active Webhooks"
          value={metrics.active_webhooks}
          icon={Webhook}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Credential Issuance Over Time</h2>
          {metrics.issuance_over_time.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.issuance_over_time}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217.2 32.6% 17.5%)" />
                  <XAxis dataKey="date" stroke="hsl(215 20.2% 65.1%)" fontSize={12} />
                  <YAxis stroke="hsl(215 20.2% 65.1%)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(222.2 84% 4.9%)",
                      border: "1px solid hsl(217.2 32.6% 17.5%)",
                      borderRadius: "0.5rem",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(210 40% 98%)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-72 items-center justify-center text-muted-foreground">
              No issuance data yet
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          {metrics.recent_credentials.length > 0 ? (
            <div className="space-y-3">
              {metrics.recent_credentials.slice(0, 5).map((cred) => (
                <div
                  key={cred.id}
                  className="flex items-center justify-between rounded border border-border p-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{cred.credential_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {cred.subject_did.slice(0, 20)}...
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs ${cred.revoked ? "text-red-400" : "text-green-400"}`}
                  >
                    {cred.revoked ? "Revoked" : "Active"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-72 items-center justify-center text-muted-foreground">
              No recent activity
            </div>
          )}
          <Link
            href="/credentials"
            className="mt-4 flex items-center justify-center gap-2 rounded border border-border p-2 text-sm text-muted-foreground hover:bg-secondary"
          >
            View all credentials <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/credentials"
            className="flex items-center gap-3 rounded border border-border p-4 hover:bg-secondary"
          >
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Issue Credential</p>
              <p className="text-xs text-muted-foreground">Create a new verifiable credential</p>
            </div>
          </Link>
          <Link
            href="/dids"
            className="flex items-center gap-3 rounded border border-border p-4 hover:bg-secondary"
          >
            <Fingerprint className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Create DID</p>
              <p className="text-xs text-muted-foreground">Register a new decentralized identifier</p>
            </div>
          </Link>
          <Link
            href="/analytics"
            className="flex items-center gap-3 rounded border border-border p-4 hover:bg-secondary"
          >
            <Activity className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">View Analytics</p>
              <p className="text-xs text-muted-foreground">Explore usage and verification stats</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
