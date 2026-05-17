import { Credential, Profile, VerificationResult } from "./types";

const BASE_URL = "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail ?? res.statusText);
  }
  return res.json();
}

export async function issueCredential(type: string, holder: string, metadata?: Record<string, unknown>): Promise<Credential> {
  return request("/api/credentials/issue", {
    method: "POST",
    body: JSON.stringify({ type, holder, metadata }),
  });
}

export async function verifyCredential(credentialId: string): Promise<VerificationResult> {
  return request(`/api/credentials/${credentialId}/verify`);
}

export async function getCredentials(): Promise<Credential[]> {
  return request("/api/credentials");
}

export async function getCredential(id: string): Promise<Credential> {
  return request(`/api/credentials/${id}`);
}

export async function getProfile(): Promise<Profile> {
  return request("/api/profile");
}
