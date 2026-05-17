"use client";

import { useEffect, useState, useCallback } from "react";
import { getWebhooks, createWebhook, deleteWebhook } from "@/lib/api";
import type { WebhookConfig } from "@/lib/types";
import { Plus, RefreshCw, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const availableEvents = [
  "credential.issued",
  "credential.revoked",
  "credential.verified",
  "did.created",
  "did.deactivated",
];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getWebhooks();
      setWebhooks(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || selectedEvents.length === 0) {
      toast.error("URL and at least one event required");
      return;
    }
    setSubmitting(true);
    try {
      await createWebhook(url, selectedEvents);
      toast.success("Webhook created");
      setShowForm(false);
      setUrl("");
      setSelectedEvents([]);
      fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create webhook");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWebhook(id);
      toast.success("Webhook deleted");
      fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete webhook");
    }
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Webhooks</h1>
          <p className="mt-1 text-muted-foreground">Manage webhook endpoints for event notifications</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add Webhook
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Create Webhook</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Webhook URL</label>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                  placeholder="https://example.com/webhook"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Events</label>
                <div className="space-y-2">
                  {availableEvents.map((event) => (
                    <label key={event} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(event)}
                        onChange={() => toggleEvent(event)}
                        className="rounded border-border bg-background"
                      />
                      <span className="text-sm">{event}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded border border-border px-4 py-2 text-sm hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create Webhook"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">All Webhooks</h2>
        <button onClick={fetchData} className="rounded border border-border p-2 hover:bg-secondary">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">Loading webhooks...</div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center text-red-400">Error: {error}</div>
      ) : webhooks.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          No webhooks configured. Click &quot;Add Webhook&quot; to create one.
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div key={wh.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2 w-2 rounded-full ${wh.active ? "bg-green-400" : "bg-red-400"}`}
                  />
                  <p className="font-medium">{wh.url}</p>
                </div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {wh.events.map((event) => (
                    <span key={event} className="rounded bg-secondary px-2 py-0.5 text-xs">
                      {event}
                    </span>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Created {new Date(wh.created_at).toLocaleDateString()}
                  {wh.last_triggered && ` · Last triggered ${new Date(wh.last_triggered).toLocaleDateString()}`}
                </p>
              </div>
              <button
                onClick={() => handleDelete(wh.id)}
                className="rounded p-2 text-muted-foreground hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
