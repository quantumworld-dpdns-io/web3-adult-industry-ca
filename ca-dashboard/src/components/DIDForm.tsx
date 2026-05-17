"use client"

import { useState } from "react"
import { createDID } from "@/lib/api"
import { Loader2 } from "lucide-react"

interface DIDFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function DIDForm({ onSuccess, onCancel }: DIDFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [method, setMethod] = useState<"key" | "web">("key")
  const [publicKey, setPublicKey] = useState("")
  const [domain, setDomain] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await createDID({
        method,
        public_key: publicKey,
        ...(method === "web" ? { domain } : {}),
      })
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create DID")
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
        <label className="text-sm font-medium">DID Method</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="method"
              value="key"
              checked={method === "key"}
              onChange={() => setMethod("key")}
              className="text-primary"
            />
            did:key
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="method"
              value="web"
              checked={method === "web"}
              onChange={() => setMethod("web")}
              className="text-primary"
            />
            did:web
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Public Key</label>
        <textarea
          value={publicKey}
          onChange={(e) => setPublicKey(e.target.value)}
          placeholder="Enter your public key in JWK or raw format..."
          rows={4}
          required
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {method === "web" && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Domain</label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
            required
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

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
          {loading ? "Creating..." : "Create DID"}
        </button>
      </div>
    </form>
  )
}
