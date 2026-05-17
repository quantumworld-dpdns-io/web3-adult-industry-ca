"use client";

import { useEffect, useState, useCallback } from "react";
import { getDIDs, resolveDID } from "@/lib/api";
import type { DIDDocument } from "@/lib/types";
import DIDForm from "@/components/DIDForm";
import { Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

export default function DIDsPage() {
  const [dids, setDIDs] = useState<DIDDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [resolveInput, setResolveInput] = useState("");
  const [resolveResult, setResolveResult] = useState<DIDDocument | null>(null);
  const [resolveLoading, setResolveLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getDIDs();
      setDIDs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load DIDs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleResolve = async () => {
    if (!resolveInput.trim()) return;
    setResolveLoading(true);
    setResolveResult(null);
    try {
      const result = await resolveDID(resolveInput.trim());
      setResolveResult(result);
      toast.success("DID resolved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to resolve DID");
    } finally {
      setResolveLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Decentralized Identifiers</h1>
          <p className="mt-1 text-muted-foreground">Manage DIDs and resolve identifiers</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Create DID
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Resolve DID</h2>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Enter DID (e.g. did:key:z6M...)"
              value={resolveInput}
              onChange={(e) => setResolveInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleResolve()}
              className="w-full rounded border border-input bg-background py-2 pl-10 pr-3 text-sm"
            />
          </div>
          <button
            onClick={handleResolve}
            disabled={resolveLoading || !resolveInput.trim()}
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {resolveLoading ? "Resolving..." : "Resolve"}
          </button>
        </div>
        {resolveResult && (
          <div className="mt-4 rounded border border-border p-4">
            <h3 className="font-medium mb-2">Resolved DID Document</h3>
            <pre className="overflow-x-auto text-xs text-muted-foreground">
              {JSON.stringify(resolveResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">All DIDs</h2>
        <button onClick={fetchData} className="rounded border border-border p-2 hover:bg-secondary">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">Loading DIDs...</div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center text-red-400">Error: {error}</div>
      ) : dids.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          No DIDs found. Click &quot;Create DID&quot; to register one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="px-4 py-3 text-left font-medium">DID</th>
                <th className="px-4 py-3 text-left font-medium">Method</th>
                <th className="px-4 py-3 text-left font-medium">Domain</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {dids.map((doc) => (
                <tr key={doc.id} className="hover:bg-secondary/50">
                  <td className="px-4 py-3 font-mono text-xs">{doc.id.slice(0, 24)}...</td>
                  <td className="px-4 py-3">{doc.method}</td>
                  <td className="px-4 py-3">{doc.domain || "-"}</td>
                  <td className="px-4 py-3">{new Date(doc.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        doc.deactivated
                          ? "bg-red-500/10 text-red-400"
                          : "bg-green-500/10 text-green-400"
                      }`}
                    >
                      {doc.deactivated ? "Deactivated" : "Active"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DIDForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={() => {
          toast.success("DID created");
          fetchData();
        }}
      />
    </div>
  );
}
