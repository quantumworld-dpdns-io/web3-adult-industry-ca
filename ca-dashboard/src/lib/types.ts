export interface Proof {
  type: string;
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  proofValue: string;
}

export interface Credential {
  id: string;
  issuer_did: string;
  subject_did: string;
  credential_type: string;
  claims: Record<string, unknown>;
  issuance_date: string;
  expiration_date: string | null;
  revoked: boolean;
  revocation_date: string | null;
  proof: Proof | null;
}

export interface DIDDocument {
  id: string;
  method: string;
  public_key: string;
  domain: string | null;
  created_at: string;
  deactivated: boolean;
}

export interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
  last_triggered: string | null;
}

export interface DashboardMetrics {
  total_dids: number;
  total_credentials: number;
  active_webhooks: number;
  total_webhooks: number;
  verification_rate: number;
  recent_credentials: Credential[];
  issuance_over_time: { date: string; count: number }[];
}

export interface User {
  id: string;
  username: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface AnalyticsResult {
  labels: string[];
  values: number[];
  total: number;
  average: number;
}

export interface ApiError {
  detail: string;
}
