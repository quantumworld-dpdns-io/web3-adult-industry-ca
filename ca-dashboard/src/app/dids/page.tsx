"use client"

import { useEffect, useState } from "react"
import { getDIDs, resolveDID } from "@/lib/api"
import type { DID } from "@/lib/types"
import { DIDForm } from "@/components/DIDForm"
import { RefreshCw, Fingerprint, Plus, Search, X, Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function DIDsPage() {
  const [dids, setDids] = useState<DID[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedDid, setSelectedDid] = useState<DID | null>(null)
  const [resolveInput, setResolveInput] = useState("")
  const [resolving, setResolving] = useState(false)
  const [resolvedDid, setResolvedDid] = useState<DID | null>(null)

  const fetchDIDs = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getDIDs()
      if (res.data) setDids(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load DIDs")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDIDs()
  }, [])

  const handleResolve = async () => {
    if (!resolveInput.trim()) return
    setResolving(true)
    setResolvedDid(null)
    try {
      const res = await resolveDID(resolveInput.trim())
      if (res.data) setResolvedDid(res.data)
      else toast.error("DID not found")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resolve DID")
    } finally {
      setResolving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">DIDs</h1>
          <p className="text-muted-foreground">
            Decentralized Identifiers management
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchDIDs}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create DID
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 text-sm font-medium">Resolve DID</h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={resolveInput}
              onChange={(e) => setResolveInput(e.target.value)}
              placeholder="did:key:z6Mk..."
              onKeyDown={(e) => e.key === "Enter" && handleResolve()}
              className="w-full rounded-md border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={handleResolve}
            disabled={resolving || !resolveInput.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {resolving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Resolve
          </button>
        </div>

        {resolvedDid && (
          <div className="mt-3 rounded-md bg-muted p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">DID found</span>
              <button onClick={() => setResolvedDid(null)}>
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            <p className="mt-1 text-muted-foreground break-all">{resolvedDid.did}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Method: {resolvedDid.method} | Active: {resolvedDid.is_active ? "Yes" : "No"}
            </p>
          </div>
        )}
      </div>

      {error && !loading ? (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-destructive">{error}</p>
          <button
            onClick={fetchDIDs}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : (
        <div className="rounded-lg border">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : dids.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Fingerprint className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No DIDs registered yet. Create your first DID to get started.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {dids.map((did) => (
                <div
                  key={did.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer"
                  onClick={() => setSelectedDid(did)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{did.did}</p>
                    <p className="text-xs text-muted-foreground">
                      Method: {did.method} | Created: {new Date(did.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`ml-4 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      did.is_active
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    {did.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create DID</h2>
              <button onClick={() => setShowCreateForm(false)}>
                <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            <DIDForm
              onSuccess={() => {
                setShowCreateForm(false)
                toast.success("DID created successfully")
                fetchDIDs()
              }}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        </div>
      )}

      {selectedDid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">DID Details</h2>
              <button onClick={() => setSelectedDid(null)}>
                <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">DID: </span>
                <span className="break-all">{selectedDid.did}</span>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Method: </span>
                {selectedDid.method}
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Active: </span>
                {selectedDid.is_active ? "Yes" : "No"}
              </div>
              {selectedDid.domain && (
                <div>
                  <span className="font-medium text-muted-foreground">Domain: </span>
                  {selectedDid.domain}
                </div>
              )}
              <div>
                <span className="font-medium text-muted-foreground">Created: </span>
                {new Date(selectedDid.created_at).toLocaleString()}
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Public Key: </span>
                <pre className="mt-1 max-h-32 overflow-auto rounded-md bg-muted p-2 text-xs">
                  {selectedDid.public_key}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
