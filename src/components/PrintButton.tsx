"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Print card" }: { label?: string }) {
  return (
    <button className="btn btn-brand btn-lg" onClick={() => window.print()} data-testid="print-card">
      <Printer size={18} /> {label}
    </button>
  );
}
