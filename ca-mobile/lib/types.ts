export type CredentialStatus = "valid" | "invalid" | "pending";

export interface Credential {
  id: string;
  type: string;
  issuer: string;
  holder: string;
  status: CredentialStatus;
  issuedDate: string;
  expirationDate?: string;
  metadata?: Record<string, unknown>;
}

export interface Profile {
  did: string;
  publicKey: string;
  reputationScore: number;
  createdAt: string;
}

export interface VerificationResult {
  credentialId: string;
  valid: boolean;
  message: string;
}

export interface ApiError {
  detail: string;
}
