#!/usr/bin/env python3
"""OWASP ZAP DAST scanner for Web3 Adult Industry CA API."""

import os
import sys
import time
import json
from dotenv import load_dotenv

load_dotenv()

ZAP_URL = os.getenv("ZAP_URL", "http://localhost:8080")
API_URL = os.getenv("API_URL", "http://localhost:8000")
ZAP_API_KEY = os.getenv("ZAP_API_KEY", "")


def connect_zap():
    try:
        from zapv2 import ZAPv2
    except ImportError:
        print("ERROR: zapv2 not installed. Run: pip install zapv2")
        sys.exit(1)

    zap = ZAPv2(apikey=ZAP_API_KEY, proxy={"http": ZAP_URL, "https": ZAP_URL})
    try:
        version = zap.core.version
        print(f"[ZAP] Connected to ZAP version: {version}")
    except Exception as exc:
        print(f"ERROR: Cannot connect to ZAP at {ZAP_URL}: {exc}")
        sys.exit(1)
    return zap


def run_spider(zap, target):
    print(f"[ZAP] Starting spider scan on {target} ...")
    scan_id = zap.spider.scan(target, maxchildren=5, recurse=True)
    if not scan_id:
        print("ERROR: Spider scan could not be started")
        sys.exit(1)

    while True:
        status = int(zap.spider.status(scan_id))
        print(f"[ZAP] Spider progress: {status}%")
        if status >= 100:
            break
        time.sleep(5)

    urls_found = zap.spider.results(scan_id)
    print(f"[ZAP] Spider found {len(urls_found)} URLs")
    return urls_found


def run_active_scan(zap, target):
    print(f"[ZAP] Starting active scan on {target} ...")
    scan_id = zap.ascan.scan(target, recurse=True)
    if not scan_id:
        print("ERROR: Active scan could not be started")
        sys.exit(1)

    while True:
        status = int(zap.ascan.status(scan_id))
        print(f"[ZAP] Active scan progress: {status}%")
        if status >= 100:
            break
        time.sleep(10)

    print("[ZAP] Active scan complete")
    return scan_id


def report_alerts(zap):
    alerts = zap.alert.alerts(baseurl=API_URL)
    if not alerts:
        print("[ZAP] No alerts found")
        return 0

    high_risk = []
    medium_risk = []
    low_risk = []
    informational = []

    for alert in alerts:
        risk = alert.get("risk", "")
        alert_detail = {
            "alert": alert.get("alert", "Unknown"),
            "risk": risk,
            "url": alert.get("url", ""),
            "description": alert.get("description", ""),
            "solution": alert.get("solution", ""),
            "param": alert.get("param", ""),
            "evidence": alert.get("evidence", ""),
            "cweid": alert.get("cweid", ""),
            "wascid": alert.get("wascid", ""),
        }

        if risk == "High":
            high_risk.append(alert_detail)
        elif risk == "Medium":
            medium_risk.append(alert_detail)
        elif risk == "Low":
            low_risk.append(alert_detail)
        else:
            informational.append(alert_detail)

    print(f"\n{'=' * 60}")
    print(f"ZAP SCAN RESULTS")
    print(f"{'=' * 60}")
    print(f"  High Risk:        {len(high_risk)}")
    print(f"  Medium Risk:      {len(medium_risk)}")
    print(f"  Low Risk:         {len(low_risk)}")
    print(f"  Informational:    {len(informational)}")
    print(f"{'=' * 60}\n")

    if high_risk:
        print(f"\n{'!' * 60}")
        print(f"HIGH RISK ALERTS ({len(high_risk)})")
        print(f"{'!' * 60}")
        for i, alert in enumerate(high_risk, 1):
            print(f"\n  [{i}] {alert['alert']}")
            print(f"      URL:     {alert['url']}")
            print(f"      Param:   {alert['param']}")
            print(f"      CWE:     {alert['cweid']}")
            print(f"      Desc:    {alert['description'][:200]}")
            print(f"      Fix:     {alert['solution'][:200]}")

    if medium_risk:
        print(f"\n{'=' * 40}")
        print(f"MEDIUM RISK ALERTS ({len(medium_risk)})")
        print(f"{'=' * 40}")
        for i, alert in enumerate(medium_risk, 1):
            print(f"  [{i}] {alert['alert']} - {alert['url']}")

    report_path = "zap_scan_report.json"
    with open(report_path, "w") as f:
        json.dump(
            {
                "summary": {
                    "high": len(high_risk),
                    "medium": len(medium_risk),
                    "low": len(low_risk),
                    "informational": len(informational),
                    "total": len(alerts),
                },
                "high_risk": high_risk,
                "medium_risk": medium_risk,
                "low_risk": low_risk,
                "informational": informational,
            },
            f,
            indent=2,
        )
    print(f"\n[ZAP] Full report saved to {report_path}")

    return len(high_risk)


def main():
    print("=" * 60)
    print("OWASP ZAP DAST Scanner")
    print("Web3 Adult Industry CA API")
    print("=" * 60)
    print(f"ZAP Proxy:  {ZAP_URL}")
    print(f"Target URL: {API_URL}")
    print()

    zap = connect_zap()

    urls = run_spider(zap, API_URL)

    if urls:
        scan_id = run_active_scan(zap, API_URL)

    high_risk_count = report_alerts(zap)

    if high_risk_count > 0:
        print(f"\n[FAIL] {high_risk_count} high-risk vulnerabilities found.")
        sys.exit(1)
    else:
        print("\n[PASS] No high-risk vulnerabilities detected.")
        sys.exit(0)


if __name__ == "__main__":
    main()
