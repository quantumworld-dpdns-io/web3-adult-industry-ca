#!/usr/bin/env bash
set -euo pipefail

# OWASP ZAP DAST Runner
# Starts ZAP in Docker, runs the vulnerability scan, and cleans up.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"

ZAP_CONTAINER_NAME="zap-dast-scanner"
ZAP_PORT="${ZAP_PORT:-8080}"
API_URL="${API_URL:-http://localhost:8000}"
ZAP_API_KEY="${ZAP_API_KEY:-}"

echo "========================================"
echo " OWASP ZAP DAST Scan"
echo "========================================"
echo "Container:  ${ZAP_CONTAINER_NAME}"
echo "ZAP Port:   ${ZAP_PORT}"
echo "Target URL: ${API_URL}"
echo ""

cleanup() {
    echo "[CLEANUP] Stopping ZAP container..."
    docker stop "${ZAP_CONTAINER_NAME}" 2>/dev/null || true
    docker rm "${ZAP_CONTAINER_NAME}" 2>/dev/null || true
    echo "[CLEANUP] Done."
}
trap cleanup EXIT

echo "[ZAP] Starting ZAP Docker container..."
docker run --rm -d \
    --name "${ZAP_CONTAINER_NAME}" \
    -p "${ZAP_PORT}:8080" \
    -v "${PROJECT_ROOT}:/zap/wrk:rw" \
    -e ZAP_API_KEY="${ZAP_API_KEY}" \
    ghcr.io/zaproxy/zaproxy:stable \
    zap.sh -daemon -host 0.0.0.0 -port 8080 \
    -config api.key="${ZAP_API_KEY}" \
    -config api.disablekey=true \
    -config connection.timeoutInSecs=120

echo "[ZAP] Waiting for ZAP to be ready..."
ZAP_URL="http://localhost:${ZAP_PORT}"
for i in $(seq 1 60); do
    if curl -sf "${ZAP_URL}" > /dev/null 2>&1; then
        echo "[ZAP] ZAP is ready after ${i}s"
        break
    fi
    if [ "$i" -eq 60 ]; then
        echo "[ERROR] ZAP failed to start within 60 seconds"
        exit 1
    fi
    sleep 2
done

echo "[ZAP] Running DAST scan..."
export ZAP_URL="${ZAP_URL}"
export API_URL="${API_URL}"
python3 "${SCRIPT_DIR}/zap_scan.py"

EXIT_CODE=$?
if [ ${EXIT_CODE} -eq 0 ]; then
    echo "[PASS] DAST scan completed successfully - no high-risk vulnerabilities"
else
    echo "[FAIL] DAST scan found high-risk vulnerabilities (exit code: ${EXIT_CODE})"
fi

exit ${EXIT_CODE}
