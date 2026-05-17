-- Total credentials issued per day
SELECT DATE(issued_at) as day, COUNT(*) as count
FROM credential_events
WHERE event_type = 'ISSUED'
GROUP BY day ORDER BY day DESC;

-- Verification success rate
SELECT 
  COUNT(*) FILTER (WHERE valid = true) * 100.0 / COUNT(*) as success_rate
FROM verification_logs;

-- Top 10 issuers by credential count
SELECT issuer_did, COUNT(*) as credential_count
FROM credential_events
GROUP BY issuer_did ORDER BY credential_count DESC LIMIT 10;
