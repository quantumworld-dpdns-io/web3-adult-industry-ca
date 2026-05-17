"use client"

import { useEffect, useState } from "react"
import { runAnalyticsQuery, getPredefinedQueries } from "@/lib/api"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Loader2, Play, RefreshCw } from "lucide-react"
import { toast } from "sonner"

export default function AnalyticsPage() {
  const [sql, setSql] = useState("")
  const [results, setResults] = useState<Record<string, unknown>[] | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [predefined, setPredefined] = useState<
    { name: string; sql: string; description: string }[]
  >([])
  const [selectedQuery, setSelectedQuery] = useState("")

  useEffect(() => {
    getPredefinedQueries()
      .then((res) => {
        if (res.data) setPredefined(res.data)
      })
      .catch(() => {})
  }, [])

  const handleRunQuery = async (querySql?: string) => {
    const q = querySql ?? sql
    if (!q.trim()) {
      toast.error("Please enter a SQL query")
      return
    }
    setRunning(true)
    setError(null)
    setResults(null)
    try {
      const res = await runAnalyticsQuery(q)
      if (res.data !== undefined) setResults(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed")
    } finally {
      setRunning(false)
    }
  }

  const selectPredefined = (querySql: string) => {
    setSql(querySql)
    setSelectedQuery(querySql)
    setResults(null)
    setError(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Query and visualize credential data
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 text-sm font-medium">Pre-defined Reports</h3>
            <div className="space-y-2">
              {predefined.map((q) => (
                <button
                  key={q.name}
                  onClick={() => selectPredefined(q.sql)}
                  className={`w-full rounded-md border p-3 text-left text-sm transition-colors hover:bg-accent ${
                    selectedQuery === q.sql ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <p className="font-medium">{q.name}</p>
                  <p className="text-xs text-muted-foreground">{q.description}</p>
                </button>
              ))}
              {predefined.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No predefined queries available from the server yet.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 text-sm font-medium">SQL Query Editor</h3>
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              placeholder="SELECT * FROM credentials LIMIT 10;"
              rows={6}
              className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => handleRunQuery()}
                disabled={running || !sql.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {running ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {running ? "Running..." : "Run Query"}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {results && (
            <div className="rounded-lg border bg-card p-4">
              <h3 className="mb-3 text-sm font-medium">
                Results ({results.length} rows)
              </h3>
              {results.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        {Object.keys(results[0]).map((key) => (
                          <th
                            key={key}
                            className="border-b px-3 py-2 text-left font-medium text-muted-foreground"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((row, i) => (
                        <tr key={i} className="hover:bg-muted/50">
                          {Object.values(row).map((val, j) => (
                            <td key={j} className="border-b px-3 py-2">
                              {String(val ?? "NULL")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Query returned no results.
                </p>
              )}
            </div>
          )}

          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 text-sm font-medium">Visualization Preview</h3>
            {results && results.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={results.slice(0, 20) as Record<string, string | number>[]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey={Object.keys(results[0])[0]}
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
                  <Bar
                    dataKey={
                      Object.keys(results[0]).find(
                        (k) => typeof results[0][k] === "number"
                      ) || Object.keys(results[0])[1]
                    }
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                Run a query to see visualization
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
