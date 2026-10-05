"use client";

import { useState } from "react";
import { PanelLeft } from "lucide-react";

/** Wraps the sidebar so it can slide in on phones. */
export function ClientShell({ sidebar, title, actions, children }: { sidebar: React.ReactNode; title: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="app">
      <aside className={`sidebar ${open ? "open" : ""}`} onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); }}>{sidebar}</aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div className="content">
        <header className="topline">
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button className="icon-btn mobile-only" aria-label="Open sidebar" onClick={() => setOpen(true)} data-testid="open-sidebar"><PanelLeft size={20} /></button>
            <span className="title">{title}</span>
          </div>
          <div>{actions}</div>
        </header>
        {children}
      </div>
    </div>
  );
}
