"use client"

import { useState } from "react"
import { issueCredential } from "@/lib/api"
import { Loader2 } from "lucide-react"

const credentialTypes = [
  { value: "AgeVerification", label: "Age Verification" },
  { value: "IdentityVerification", label: "Identity Verification" },
  { value: "ContentCreator", label: "Content Creator" },
  { value: "PlatformLicense", label: "Platform License" },
  { value: "ComplianceCertificate", label: "Compliance Certificate" },
]

interface CredentialFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function CredentialForm({ onSuccess, onCancel }: CredentialFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    type: "AgeVerification",
    issuer_did: "",
    subject_did: "",
    expires_in_days: 365,
  })
  const [claims, setClaims] = useState<Record<string, string>>({})

  const addClaim = () => {
    const key = prompt("Claim key:")
    if (key) setClaims((c) => ({ ...c, [key]: "" }))
  }

  const removeClaim = (key: string) => {
    setClaims((c) => {
      const next = { ...c }
      delete next[key]
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const claimsObj: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(claims)) {
        claimsObj[k] = v
      }
      await issueCredential({
        ...formData,
        claims: claimsObj,
      })
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to issue credential")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Credential Type</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData((f) => ({ ...f, type: e.target.value }))}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          {credentialTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Issuer DID</label>
        <input
          type="text"
          value={formData.issuer_did}
          onChange={(e) => setFormData((f) => ({ ...f, issuer_did: e.target.value }))}
          placeholder="did:key:z6Mk..."
          required
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Subject DID</label>
        <input
          type="text"
          value={formData.subject_did}
          onChange={(e) => setFormData((f) => ({ ...f, subject_did: e.target.value }))}
          placeholder="did:key:z6Mk..."
          required
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Expires In (days): {formData.expires_in_days}
        </label>
        <input
          type="range"
          min={1}
          max={1825}
          value={formData.expires_in_days}
          onChange={(e) => setFormData((f) => ({ ...f, expires_in_days: Number(e.target.value) }))}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Custom Claims</label>
          <button
            type="button"
            onClick={addClaim}
            className="text-xs text-primary hover:underline"
          >
            + Add Claim
          </button>
        </div>
        {Object.entries(claims).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-24 text-xs text-muted-foreground">{key}:</span>
            <input
              type="text"
              value={value}
              onChange={(e) => setClaims((c) => ({ ...c, [key]: e.target.value }))}
              className="flex-1 rounded-md border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => removeClaim(key)}
              className="text-xs text-destructive hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Issuing..." : "Issue Credential"}
        </button>
      </div>
    </form>
  )
}
