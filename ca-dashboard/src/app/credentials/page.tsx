"use client";

import { useEffect, useState, useCallback } from "react";
import { getCredentials, revokeCredential } from "@/lib/api";
import type { Credential } from "@/lib/types";
import CredentialForm from "@/components/CredentialForm";
import { Plus, Search, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";

const credentialTypes = ["", "identity", "age_verification", "content_license", "platform_membership"];

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getCredentials({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setCredentials(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load credentials");
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRevoke = async (id: string) => {
    try {
      await revokeCredential(id);
      toast.success("Credential revoked");
      fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to revoke");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Credentials</h1>
          <p className="mt-1 text-muted-foreground">Manage verifiable credentials</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Issue Credential
        </button>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search credentials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border border-input bg-background py-2 pl-10 pr-3 text-sm"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          {credentialTypes.filter(Boolean).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="revoked">Revoked</option>
          <option value="expired">Expired</option>
        </select>
        <button
          onClick={fetchData}
          className="rounded border border-border p-2 hover:bg-secondary"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Loading credentials...
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center text-red-400">
          Error: {error}
        </div>
      ) : credentials.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          No credentials found. Click &quot;Issue Credential&quot; to create one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="px-4 py-3 text-left font-medium">ID</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Issuer</th>
                <th className="px-4 py-3 text-left font-medium">Subject</th>
                <th className="px-4 py-3 text-left font-medium">Issued</th>
                <th className="px-4 py-3 text-left font-medium">Expires</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {credentials.map((cred) => (
                <tr key={cred.id} className="hover:bg-secondary/50">
                  <td className="px-4 py-3 font-mono text-xs">{cred.id.slice(0, 12)}...</td>
                  <td className="px-4 py-3">{cred.credential_type}</td>
                  <td className="px-4 py-3 font-mono text-xs">{cred.issuer_did.slice(0, 16)}...</td>
                  <td className="px-4 py-3 font-mono text-xs">{cred.subject_did.slice(0, 16)}...</td>
                  <td className="px-4 py-3">{new Date(cred.issuance_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {cred.expiration_date ? new Date(cred.expiration_date).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        cred.revoked
                          ? "bg-red-500/10 text-red-400"
                          : cred.expiration_date && new Date(cred.expiration_date) < new Date()
                          ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-green-500/10 text-green-400"
                      }`}
                    >
                      {cred.revoked ? "Revoked" : cred.expiration_date && new Date(cred.expiration_date) < new Date() ? "Expired" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!cred.revoked && (
                      <button
                        onClick={() => handleRevoke(cred.id)}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                      >
                        <XCircle className="h-3 w-3" />
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CredentialForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={() => {
          toast.success("Credential issued");
          fetchData();
        }}
      />
    </div>
  );
}
