import type {
  ApiResponse,
  Credential,
  DashboardMetrics,
  DID,
  PaginatedResponse,
  ReputationScore,
  User,
  VerificationResult,
  Webhook,
} from "./types"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

function getApiKey(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("api_key") || process.env.NEXT_PUBLIC_API_KEY || null
  }
  return process.env.NEXT_PUBLIC_API_KEY || null
}

async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }

  if (apiKey) {
    headers["X-API-Key"] = apiKey
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    const message = errorData?.detail || errorData?.error || `API error: ${response.statusText}`
    throw new Error(message)
  }

  return response.json()
}

export async function getDashboardMetrics(): Promise<ApiResponse<DashboardMetrics>> {
  return apiClient("/api/admin/dashboard")
}

export async function issueCredential(data: {
  type: string
  issuer_did: string
  subject_did: string
  claims: Record<string, unknown>
  expires_in_days?: number
}): Promise<ApiResponse<Credential>> {
  return apiClient("/api/credentials/issue", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function verifyCredential(credentialId: string): Promise<ApiResponse<VerificationResult>> {
  return apiClient(`/api/credentials/${credentialId}/verify`)
}

export async function getCredentials(params?: {
  type?: string
  status?: string
  page?: number
  per_page?: number
}): Promise<PaginatedResponse<Credential>> {
  const searchParams = new URLSearchParams()
  if (params?.type) searchParams.set("type", params.type)
  if (params?.status) searchParams.set("status", params.status)
  if (params?.page) searchParams.set("page", String(params.page))
  if (params?.per_page) searchParams.set("per_page", String(params.per_page))
  const qs = searchParams.toString()
  return apiClient(`/api/credentials${qs ? `?${qs}` : ""}`)
}

export async function getCredential(id: string): Promise<ApiResponse<Credential>> {
  return apiClient(`/api/credentials/${id}`)
}

export async function revokeCredential(id: string): Promise<ApiResponse<Credential>> {
  return apiClient(`/api/credentials/${id}/revoke`, { method: "POST" })
}

export async function createDID(data: {
  method: "key" | "web"
  public_key: string
  domain?: string
}): Promise<ApiResponse<DID>> {
  return apiClient("/api/dids/create", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function resolveDID(did: string): Promise<ApiResponse<DID>> {
  return apiClient(`/api/dids/${encodeURIComponent(did)}`)
}

export async function getDIDs(): Promise<ApiResponse<DID[]>> {
  return apiClient("/api/dids")
}

export async function getWebhooks(): Promise<ApiResponse<Webhook[]>> {
  return apiClient("/api/admin/webhooks")
}

export async function createWebhook(data: {
  url: string
  events: string[]
}): Promise<ApiResponse<Webhook>> {
  return apiClient("/api/admin/webhooks", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function deleteWebhook(id: string): Promise<ApiResponse<void>> {
  return apiClient(`/api/admin/webhooks/${id}`, { method: "DELETE" })
}

export async function testWebhook(id: string): Promise<ApiResponse<{ status: number }>> {
  return apiClient(`/api/admin/webhooks/${id}/test`, { method: "POST" })
}

export async function runAnalyticsQuery(sql: string): Promise<ApiResponse<Record<string, unknown>[]>> {
  return apiClient("/api/admin/analytics/query", {
    method: "POST",
    body: JSON.stringify({ sql }),
  })
}

export async function getPredefinedQueries(): Promise<ApiResponse<Array<{ name: string; sql: string; description: string }>>> {
  return apiClient("/api/admin/analytics/queries")
}

export async function adminGetUsers(): Promise<ApiResponse<User[]>> {
  return apiClient("/api/admin/users")
}

export async function adminCreateUser(data: {
  email: string
  username: string
  password: string
  role: "admin" | "viewer"
}): Promise<ApiResponse<User>> {
  return apiClient("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function adminDeleteUser(id: string): Promise<ApiResponse<void>> {
  return apiClient(`/api/admin/users/${id}`, { method: "DELETE" })
}

export async function adminSeedData(): Promise<ApiResponse<{ message: string }>> {
  return apiClient("/api/admin/seed", { method: "POST" })
}

export async function getReputation(did: string): Promise<ApiResponse<ReputationScore>> {
  return apiClient(`/api/reputation/${encodeURIComponent(did)}`)
}

export async function getTopReputation(limit?: number): Promise<ApiResponse<ReputationScore[]>> {
  const qs = limit ? `?limit=${limit}` : ""
  return apiClient(`/api/reputation/top${qs}`)
}

export async function getCredentialsBySubject(
  subjectDid: string,
  params?: { page?: number; per_page?: number }
): Promise<PaginatedResponse<Credential>> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set("page", String(params.page))
  if (params?.per_page) searchParams.set("per_page", String(params.per_page))
  const qs = searchParams.toString()
  return apiClient(`/api/credentials?subject_did=${encodeURIComponent(subjectDid)}${qs ? `&${qs}` : ""}`)
}
