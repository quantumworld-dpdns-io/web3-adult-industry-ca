"use client";

import { useState, useEffect } from "react";
import { Search, Trophy, ArrowUp, ArrowDown, Minus } from "lucide-react";

interface ReputationEntry {
  did: string;
  score: number;
  rank: number;
  change: "up" | "down" | "same";
  credential_count: number;
  verified_count: number;
}

export default function ReputationPage() {
  const [entries, setEntries] = useState<ReputationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "rank">("rank");

  useEffect(() => {
    const fetchReputation = async () => {
      setLoading(true);
      setError("");
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (sortBy) params.set("sort", sortBy);
        const res = await fetch(`${baseUrl}/reputation${params.toString() ? `?${params}` : ""}`, {
          headers: {
            "Content-Type": "application/json",
            ...(process.env.NEXT_PUBLIC_API_KEY
              ? { "X-API-Key": process.env.NEXT_PUBLIC_API_KEY }
              : {}),
          },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(body.detail || `Request failed: ${res.status}`);
        }
        const result = await res.json();
        setEntries(Array.isArray(result) ? result : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load reputation data");
      } finally {
        setLoading(false);
      }
    };
    fetchReputation();
  }, [search, sortBy]);

  const getChangeIcon = (change: "up" | "down" | "same") => {
    switch (change) {
      case "up":
        return <ArrowUp className="h-4 w-4 text-green-400" />;
      case "down":
        return <ArrowDown className="h-4 w-4 text-red-400" />;
      case "same":
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-400" />;
    if (rank === 2) return <Trophy className="h-5 w-5 text-gray-300" />;
    if (rank === 3) return <Trophy className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-medium text-muted-foreground">#{rank}</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reputation Explorer</h1>
        <p className="mt-1 text-muted-foreground">
          Search reputation scores and view the leaderboard
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search by DID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border border-input bg-background py-2 pl-10 pr-3 text-sm"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "score" | "rank")}
          className="rounded border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="rank">Sort by Rank</option>
          <option value="score">Sort by Score</option>
        </select>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Loading reputation data...
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center text-red-400">
          Error: {error}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          {search
            ? "No results found for your search"
            : "No reputation data available yet"}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Rank</th>
                <th className="px-4 py-3 text-left font-medium">DID</th>
                <th className="px-4 py-3 text-left font-medium">Score</th>
                <th className="px-4 py-3 text-left font-medium">Change</th>
                <th className="px-4 py-3 text-left font-medium">Credentials</th>
                <th className="px-4 py-3 text-left font-medium">Verified</th>
                <th className="px-4 py-3 text-left font-medium">Verification Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((entry) => (
                <tr key={entry.did} className="hover:bg-secondary/50">
                  <td className="px-4 py-3">{getRankBadge(entry.rank)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{entry.did.slice(0, 24)}...</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.min(entry.score, 100)}%` }}
                        />
                      </div>
                      <span className="font-medium">{entry.score}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{getChangeIcon(entry.change)}</td>
                  <td className="px-4 py-3">{entry.credential_count}</td>
                  <td className="px-4 py-3">{entry.verified_count}</td>
                  <td className="px-4 py-3">
                    {entry.credential_count > 0
                      ? `${((entry.verified_count / entry.credential_count) * 100).toFixed(0)}%`
                      : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
