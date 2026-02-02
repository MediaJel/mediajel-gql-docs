"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Lock,
  Building2,
  Megaphone,
  ClipboardList,
  List,
  BookOpen,
  Play,
  MessageSquare,
  Zap,
  KeyRound,
  Gauge,
  ArrowLeftRight,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const iconMap: Record<string, React.ReactNode> = {
  lock: <Lock className="h-4 w-4" />,
  building: <Building2 className="h-4 w-4" />,
  megaphone: <Megaphone className="h-4 w-4" />,
  "clipboard-list": <ClipboardList className="h-4 w-4" />,
  list: <List className="h-4 w-4" />,
};

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

const sections: NavSection[] = [
  {
    title: "Getting Started",
    items: [
      { label: "Quickstart", href: "/guides/quickstart", icon: <Zap className="h-4 w-4" /> },
      { label: "Authentication", href: "/guides/authentication", icon: <KeyRound className="h-4 w-4" /> },
    ],
  },
  {
    title: "API Reference",
    items: [
      { label: "Schema Overview", href: "/schema", icon: <BookOpen className="h-4 w-4" /> },
      { label: "Authentication", href: "/schema/auth", icon: <Lock className="h-4 w-4" /> },
      { label: "Organizations", href: "/schema/organizations", icon: <Building2 className="h-4 w-4" /> },
      { label: "Campaign Orders", href: "/schema/campaign-orders", icon: <ClipboardList className="h-4 w-4" /> },
      { label: "Campaigns", href: "/schema/campaigns", icon: <Megaphone className="h-4 w-4" /> },
      { label: "Line Items", href: "/schema/line-items", icon: <List className="h-4 w-4" /> },
    ],
  },
  {
    title: "Tools",
    items: [
      { label: "Playground", href: "/playground", icon: <Play className="h-4 w-4" /> },
      { label: "AI Assistant", href: "/assistant", icon: <MessageSquare className="h-4 w-4" /> },
    ],
  },
  {
    title: "Guides",
    items: [
      { label: "Rate Limits", href: "/guides/rate-limits", icon: <Gauge className="h-4 w-4" /> },
      { label: "Pagination", href: "/guides/pagination", icon: <ArrowLeftRight className="h-4 w-4" /> },
      { label: "Error Handling", href: "/guides/error-handling", icon: <AlertTriangle className="h-4 w-4" /> },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) => {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside className="w-64 border-r border-border bg-card flex-shrink-0 overflow-y-auto h-[calc(100vh-3.5rem)]">
      <nav className="p-4 space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <button
              onClick={() => toggleSection(section.title)}
              className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 hover:text-foreground transition-colors"
            >
              {section.title}
              {collapsed[section.title] ? (
                <ChevronRight className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            {!collapsed[section.title] && (
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                        pathname === item.href
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
