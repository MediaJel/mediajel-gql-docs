"use client";

import Link from "next/link";
import {
  BarChart3,
  List,
  TrendingUp,
  Key,
  Building2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GoalCard {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
}

const goals: GoalCard[] = [
  {
    title: "Track Campaign Performance",
    description: "Get impressions, clicks, spend, and ROAS",
    href: "/recipes/campaign-performance",
    icon: <BarChart3 className="h-5 w-5" />,
    color: "bg-blue-500",
  },
  {
    title: "List My Campaigns",
    description: "View all campaigns with statuses and budgets",
    href: "/recipes/list-campaigns",
    icon: <List className="h-5 w-5" />,
    color: "bg-green-500",
  },
  {
    title: "Get Analytics Data",
    description: "Fetch attribution and conversion metrics",
    href: "/recipes/analytics",
    icon: <TrendingUp className="h-5 w-5" />,
    color: "bg-purple-500",
  },
  {
    title: "Get Started",
    description: "Authenticate and make your first API call",
    href: "/guides/quickstart",
    icon: <Key className="h-5 w-5" />,
    color: "bg-amber-500",
  },
  {
    title: "Manage Organizations",
    description: "List and access organization data",
    href: "/recipes/organizations",
    icon: <Building2 className="h-5 w-5" />,
    color: "bg-pink-500",
  },
  {
    title: "Explore All Operations",
    description: "Browse the complete API reference",
    href: "/schema",
    icon: <Sparkles className="h-5 w-5" />,
    color: "bg-slate-500",
  },
];

interface GoalCardsProps {
  className?: string;
}

export function GoalCards({ className }: GoalCardsProps) {
  return (
    <section className={cn("", className)}>
      <h2 className="text-lg font-semibold mb-4">What do you want to do?</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {goals.map((goal) => (
          <Link
            key={goal.href}
            href={goal.href}
            className="group flex items-start gap-4 p-4 border border-border rounded-lg bg-card hover:border-primary/50 hover:bg-accent/30 transition-all"
          >
            <div
              className={cn(
                "flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center text-white",
                goal.color
              )}
            >
              {goal.icon}
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-sm mb-0.5 group-hover:text-primary transition-colors">
                {goal.title}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {goal.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
