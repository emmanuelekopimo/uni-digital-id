import type { ScanResult } from "@/db/schema";
import { RESULT_UI } from "@/lib/tones";

export function ResultPill({ result }: { result: ScanResult }) {
  const ui = RESULT_UI[result];
  return <span className={`pill ${ui.tone}`}>{ui.label}</span>;
}
