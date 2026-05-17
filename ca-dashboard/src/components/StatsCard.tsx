"use client"

import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: { value: number; isUp: boolean }
  loading?: boolean
}

export function StatsCard({ title, value, description, icon: Icon, trend, loading }: StatsCardProps) {
  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-8 w-16 animate-pulse rounded bg-muted" />
            {description && <div className="h-3 w-32 animate-pulse rounded bg-muted" />}
          </div>
          {Icon && <div className="h-10 w-10 animate-pulse rounded bg-muted" />}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 pt-1">
              <span
                className={cn(
                  "inline-flex items-center text-xs font-medium",
                  trend.isUp ? "text-emerald-500" : "text-red-500"
                )}
              >
                {trend.isUp ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-muted-foreground">vs last period</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="rounded-lg bg-primary/10 p-3">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        )}
      </div>
    </div>
  )
}
