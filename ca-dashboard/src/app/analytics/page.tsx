"use client";

import { useEffect, useState, useCallback } from "react";
import { getAnalytics } from "@/lib/api";
import type { AnalyticsResult } from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const reports = [
  { value: "credentials_by_type", label: "Credentials by Type" },
  { value: "credentials_by_status", label: "Credentials by Status" },
  { value: "dids_by_method", label: "DIDs by Method" },
  { value: "issuance_trend", label: "Issuance Trend (30 days)" },
  { value: "verification_trend", label: "Verification Trend (30 days)" },
];

const COLORS = ["#60a5fa", "#34d399", "#f472b6", "#fbbf24", "#a78bfa", "#fb923c"];

export default function AnalyticsPage() {
  const [selectedReport, setSelectedReport] = useState(reports[0].value);
  const [data, setData] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getAnalytics(selectedReport);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [selectedReport]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const chartData = data
    ? data.labels.map((label, i) => ({
        name: label,
        value: data.values[i] || 0,
      }))
    : [];

  const isPie = ["credentials_by_type", "credentials_by_status", "dids_by_method"].includes(selectedReport);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="mt-1 text-muted-foreground">Explore usage and performance metrics</p>
      </div>

      <div className="flex gap-4">
        <select
          value={selectedReport}
          onChange={(e) => setSelectedReport(e.target.value)}
          className="rounded border border-input bg-background px-3 py-2 text-sm"
        >
          {reports.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center text-muted-foreground">
          Loading analytics...
        </div>
      ) : error ? (
        <div className="flex h-96 items-center justify-center text-red-400">
          Error: {error}
        </div>
      ) : !data || data.labels.length === 0 ? (
        <div className="flex h-96 items-center justify-center text-muted-foreground">
          No data available for this report
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">{reports.find((r) => r.value === selectedReport)?.label}</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {isPie ? (
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(222.2 84% 4.9%)",
                        border: "1px solid hsl(217.2 32.6% 17.5%)",
                        borderRadius: "0.5rem",
                      }}
                    />
                  </PieChart>
                ) : (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(217.2 32.6% 17.5%)" />
                    <XAxis dataKey="name" stroke="hsl(215 20.2% 65.1%)" fontSize={12} />
                    <YAxis stroke="hsl(215 20.2% 65.1%)" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(222.2 84% 4.9%)",
                        border: "1px solid hsl(217.2 32.6% 17.5%)",
                        borderRadius: "0.5rem",
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(210 40% 98%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground">Total</h3>
              <p className="text-3xl font-bold mt-1">{data.total}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground">Average</h3>
              <p className="text-3xl font-bold mt-1">{typeof data.average === "number" ? data.average.toFixed(1) : data.average}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-sm font-medium text-muted-foreground">Breakdown</h3>
              <div className="mt-3 space-y-2">
                {chartData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
