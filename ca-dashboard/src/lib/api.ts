import type { Credential, DIDDocument, WebhookConfig, DashboardMetrics, User, AnalyticsResult } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Health
export async function healthCheck() {
  return request<{ status: string }>("/health");
}

// Credentials
export async function issueCredential(
  issuer_did: string,
  subject_did: string,
  credential_type: string,
  claims: Record<string, unknown>,
  expiration_days?: number
) {
  return request<Credential>("/credentials/issue", {
    method: "POST",
    body: JSON.stringify({ issuer_did, subject_did, credential_type, claims, expiration_days }),
  });
}

export async function verifyCredential(credential_json: Record<string, unknown>) {
  return request<{ valid: boolean; message: string }>("/credentials/verify", {
    method: "POST",
    body: JSON.stringify(credential_json),
  });
}

export async function revokeCredential(credential_id: string) {
  return request<Credential>(`/credentials/${credential_id}/revoke`, {
    method: "POST",
  });
}

export async function getCredential(id: string) {
  return request<Credential>(`/credentials/${id}`);
}

export async function getCredentials(params?: { type?: string; status?: string; search?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.set("type", params.type);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.search) searchParams.set("search", params.search);
  const qs = searchParams.toString();
  return request<Credential[]>(`/credentials${qs ? `?${qs}` : ""}`);
}

// DIDs
export async function createDID(method: string, public_key: string, domain?: string) {
  return request<DIDDocument>("/dids/create", {
    method: "POST",
    body: JSON.stringify({ method, public_key, domain }),
  });
}

export async function resolveDID(did: string) {
  return request<DIDDocument>(`/dids/${encodeURIComponent(did)}`);
}

export async function getDIDs() {
  return request<DIDDocument[]>("/dids");
}

// Webhooks
export async function getWebhooks() {
  return request<WebhookConfig[]>("/webhooks");
}

export async function createWebhook(url: string, events: string[]) {
  return request<WebhookConfig>("/webhooks", {
    method: "POST",
    body: JSON.stringify({ url, events }),
  });
}

export async function deleteWebhook(id: string) {
  return request<void>(`/webhooks/${id}`, { method: "DELETE" });
}

// Dashboard
export async function getDashboardMetrics() {
  return request<DashboardMetrics>("/dashboard/metrics");
}

// Analytics
export async function getAnalytics(report: string) {
  return request<AnalyticsResult>(`/analytics/${report}`);
}

// Users
export async function getUsers() {
  return request<User[]>("/admin/users");
}

export async function createUser(username: string, password: string, role: string) {
  return request<User>("/admin/users", {
    method: "POST",
    body: JSON.stringify({ username, password, role }),
  });
}

export async function deleteUser(id: string) {
  return request<void>(`/admin/users/${id}`, { method: "DELETE" });
}

export async function seedData() {
  return request<{ message: string }>("/admin/seed", { method: "POST" });
}
