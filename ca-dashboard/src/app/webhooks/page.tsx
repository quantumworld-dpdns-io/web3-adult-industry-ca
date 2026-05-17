"use client"

import { useEffect, useState } from "react"
import { getWebhooks, createWebhook, deleteWebhook, testWebhook } from "@/lib/api"
import type { Webhook } from "@/lib/types"
import { RefreshCw, Plus, Trash2, Play, X, Loader2 } from "lucide-react"
import { toast } from "sonner"

const availableEvents = [
  "credential.issued",
  "credential.revoked",
  "credential.expired",
  "did.created",
  "did.deactivated",
  "verification.completed",
  "reputation.updated",
]

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newUrl, setNewUrl] = useState("")
  const [newEvents, setNewEvents] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)

  const fetchWebhooks = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getWebhooks()
      if (res.data) setWebhooks(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load webhooks")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWebhooks()
  }, [])

  const toggleEvent = (event: string) => {
    setNewEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    )
  }

  const handleCreate = async () => {
    if (!newUrl.trim() || newEvents.length === 0) {
      toast.error("URL and at least one event required")
      return
    }
    setCreating(true)
    try {
      await createWebhook({ url: newUrl, events: newEvents })
      toast.success("Webhook created")
      setShowCreate(false)
      setNewUrl("")
      setNewEvents([])
      fetchWebhooks()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create webhook")
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteWebhook(id)
      toast.success("Webhook deleted")
      fetchWebhooks()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete webhook")
    }
  }

  const handleTest = async (id: string) => {
    setTestingId(id)
    try {
      const res = await testWebhook(id)
      toast.success(`Test sent - status: ${res.data?.status ?? "unknown"}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test failed")
    } finally {
      setTestingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground">
            Configure webhook notifications
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchWebhooks}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Webhook
          </button>
        </div>
      </div>

      {error && !loading ? (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-destructive">{error}</p>
          <button
            onClick={fetchWebhooks}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border bg-card" />
          ))}
        </div>
      ) : webhooks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-card py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No webhooks configured. Add a webhook to receive event notifications.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div
              key={wh.id}
              className="rounded-lg border bg-card p-4"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium break-all">{wh.url}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {wh.events.map((ev) => (
                      <span
                        key={ev}
                        className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                      >
                        {ev}
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Created: {new Date(wh.created_at).toLocaleDateString()}
                    {" · "}
                    {wh.is_active ? "Active" : "Inactive"}
                  </p>
                </div>
                <div className="ml-4 flex gap-2">
                  <button
                    onClick={() => handleTest(wh.id)}
                    disabled={testingId === wh.id}
                    className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs font-medium hover:bg-accent"
                  >
                    {testingId === wh.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                    Test
                  </button>
                  <button
                    onClick={() => handleDelete(wh.id)}
                    className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create Webhook</h2>
              <button onClick={() => setShowCreate(false)}>
                <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Webhook URL</label>
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://example.com/webhook"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Events</label>
                <div className="grid grid-cols-2 gap-2">
                  {availableEvents.map((event) => (
                    <label
                      key={event}
                      className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                    >
                      <input
                        type="checkbox"
                        checked={newEvents.includes(event)}
                        onChange={() => toggleEvent(event)}
                        className="text-primary"
                      />
                      {event}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
