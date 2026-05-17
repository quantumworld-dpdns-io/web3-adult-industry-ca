export interface Credential {
  id: string
  type: string
  issuer_did: string
  subject_did: string
  status: "active" | "revoked" | "expired"
  claims: Record<string, unknown>
  issued_at: string
  expires_at: string | null
  revoked_at: string | null
}

export interface DID {
  id: string
  did: string
  method: "key" | "web"
  public_key: string
  domain: string | null
  created_at: string
  is_active: boolean
}

export interface Webhook {
  id: string
  url: string
  events: string[]
  is_active: boolean
  created_at: string
}

export interface AnalyticsQuery {
  id: string
  name: string
  sql: string
  description: string
}

export interface DashboardMetrics {
  total_credentials: number
  active_credentials: number
  revoked_credentials: number
  total_dids: number
  active_dids: number
  verification_rate: number
  average_reputation: number
  recent_activity: ActivityItem[]
  issuance_trend: TrendDataPoint[]
}

export interface ActivityItem {
  id: string
  type: "credential_issued" | "credential_revoked" | "did_created" | "webhook_triggered"
  description: string
  timestamp: string
}

export interface TrendDataPoint {
  date: string
  count: number
}

export interface User {
  id: string
  email: string
  username: string
  role: "admin" | "viewer"
  is_active: boolean
  created_at: string
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  detail?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
}

export interface ReputationScore {
  did: string
  total_credentials: number
  verified_credentials: number
  revoked_credentials: number
  reports: number
  score: number
  history: ReputationHistoryPoint[]
}

export interface ReputationHistoryPoint {
  date: string
  score: number
}

export interface VerificationResult {
  credential_id: string
  is_valid: boolean
  checks: {
    signature: boolean
    expiration: boolean
    revocation: boolean
    issuer: boolean
  }
}
