"use client"

import { useEffect, useState } from "react"
import { getCredentials, revokeCredential, verifyCredential } from "@/lib/api"
import type { Credential } from "@/lib/types"
import { DataTable } from "@/components/DataTable"
import { CredentialForm } from "@/components/CredentialForm"
import { Loader2, RefreshCw, Shield, X } from "lucide-react"
import { toast } from "sonner"

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showIssueForm, setShowIssueForm] = useState(false)
  const [selectedCred, setSelectedCred] = useState<Credential | null>(null)
  const [filterType, setFilterType] = useState("")
  const [filterStatus, setFilterStatus] = useState("")

  const fetchCredentials = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getCredentials({
        type: filterType || undefined,
        status: filterStatus || undefined,
      })
      setCredentials(res.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load credentials")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCredentials()
  }, [filterType, filterStatus])

  const handleRevoke = async (id: string) => {
    try {
      await revokeCredential(id)
      toast.success("Credential revoked")
      fetchCredentials()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke")
    }
  }

  const handleVerify = async (id: string) => {
    try {
      const res = await verifyCredential(id)
      if (res.data?.is_valid) {
        toast.success("Credential is valid")
      } else {
        toast.error("Credential verification failed")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification error")
    }
  }

  const columns = [
    { key: "id", header: "ID", sortable: true },
    { key: "type", header: "Type", sortable: true },
    { key: "issuer_did", header: "Issuer", sortable: true },
    { key: "subject_did", header: "Subject", sortable: true },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (item: Credential) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            item.status === "active"
              ? "bg-emerald-500/10 text-emerald-500"
              : item.status === "revoked"
              ? "bg-red-500/10 text-red-500"
              : "bg-yellow-500/10 text-yellow-500"
          }`}
        >
          {item.status}
        </span>
      ),
    },
    {
      key: "issued_at",
      header: "Issued",
      sortable: true,
      render: (item: Credential) => new Date(item.issued_at).toLocaleDateString(),
    },
    {
      key: "actions",
      header: "Actions",
      render: (item: Credential) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleVerify(item.id)
            }}
            className="text-xs text-primary hover:underline"
          >
            Verify
          </button>
          {item.status === "active" && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleRevoke(item.id)
              }}
              className="text-xs text-destructive hover:underline"
            >
              Revoke
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Credentials</h1>
          <p className="text-muted-foreground">
            Manage digital credentials
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchCredentials}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowIssueForm(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Shield className="h-4 w-4" />
            Issue New
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Types</option>
          <option value="AgeVerification">Age Verification</option>
          <option value="IdentityVerification">Identity Verification</option>
          <option value="ContentCreator">Content Creator</option>
          <option value="PlatformLicense">Platform License</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="revoked">Revoked</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {error && !loading ? (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-destructive">{error}</p>
          <button
            onClick={fetchCredentials}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={credentials}
          loading={loading}
          searchable
          searchKeys={["id", "type", "issuer_did", "subject_did"]}
          onRowClick={(item) => setSelectedCred(item as unknown as Credential)}
          emptyMessage="No credentials found. Issue your first credential to get started."
        />
      )}

      {showIssueForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Issue New Credential</h2>
              <button onClick={() => setShowIssueForm(false)}>
                <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            <CredentialForm
              onSuccess={() => {
                setShowIssueForm(false)
                toast.success("Credential issued successfully")
                fetchCredentials()
              }}
              onCancel={() => setShowIssueForm(false)}
            />
          </div>
        </div>
      )}

      {selectedCred && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Credential Details</h2>
              <button onClick={() => setSelectedCred(null)}>
                <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">ID: </span>
                {selectedCred.id}
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Type: </span>
                {selectedCred.type}
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Issuer: </span>
                {selectedCred.issuer_did}
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Subject: </span>
                {selectedCred.subject_did}
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Status: </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    selectedCred.status === "active"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : selectedCred.status === "revoked"
                      ? "bg-red-500/10 text-red-500"
                      : "bg-yellow-500/10 text-yellow-500"
                  }`}
                >
                  {selectedCred.status}
                </span>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Issued: </span>
                {new Date(selectedCred.issued_at).toLocaleString()}
              </div>
              {selectedCred.expires_at && (
                <div>
                  <span className="font-medium text-muted-foreground">Expires: </span>
                  {new Date(selectedCred.expires_at).toLocaleString()}
                </div>
              )}
              {selectedCred.revoked_at && (
                <div>
                  <span className="font-medium text-muted-foreground">Revoked: </span>
                  {new Date(selectedCred.revoked_at).toLocaleString()}
                </div>
              )}
              <div>
                <span className="font-medium text-muted-foreground">Claims: </span>
                <pre className="mt-1 rounded-md bg-muted p-2 text-xs">
                  {JSON.stringify(selectedCred.claims, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
