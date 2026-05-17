# Cilium Tetragon Integration — Runtime Security

eBPF-based Kubernetes runtime security using Cilium Tetragon. Provides tracing policies for CA services to monitor:

- Credential signing operations
- API access patterns
- File access to key material

## Deploy

```bash
kubectl apply -f tracing-policy-api.yaml
kubectl apply -f tracing-policy-signing.yaml
```

## Policies

- `tracing-policy-api.yaml` — Monitors `security_file_permission` on the CA API service
- `tracing-policy-signing.yaml` — Monitors file opens under `/etc/ca-keys/`
