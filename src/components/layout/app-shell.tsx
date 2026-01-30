"use client";

import { useState } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { ChatDrawer } from "@/components/assistant/chat-drawer";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen">
      <Header onToggleAssistant={() => setDrawerOpen((prev) => !prev)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <ChatDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
