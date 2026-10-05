import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import type { Student } from "@/db/schema";
import { avatarUri } from "./avatar";
import { fmtDate } from "./format";
import { fullName } from "./verify";

/** CR80 ID-1 card (85.6 x 53.98 mm) at 300 dpi. */
export const CARD_PX = { width: 1012, height: 638 };

const font = (pkg: string, file: string) => readFileSync(path.join(process.cwd(), "node_modules", pkg, "files", file));
// Read once per server process; Satori needs ttf, otf or woff (not woff2).
const FONTS = [
  { name: "Inter", data: font("@fontsource/inter", "inter-latin-400-normal.woff"), weight: 400 as const, style: "normal" as const },
  { name: "Inter", data: font("@fontsource/inter", "inter-latin-600-normal.woff"), weight: 600 as const, style: "normal" as const },
  { name: "Inter", data: font("@fontsource/inter", "inter-latin-800-normal.woff"), weight: 800 as const, style: "normal" as const },
  { name: "Mono", data: font("@fontsource/jetbrains-mono", "jetbrains-mono-latin-700-normal.woff"), weight: 700 as const, style: "normal" as const },
];
const LOGO = `data:image/svg+xml;base64,${readFileSync(path.join(process.cwd(), "public", "logo-white.svg")).toString("base64")}`;

/** Satori only reads base64 data URIs, while DiceBear returns a URL-encoded one. */
function toBase64Uri(uri: string) {
  if (uri.includes(";base64,")) return uri;
  const svg = decodeURIComponent(uri.slice(uri.indexOf(",") + 1));
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

const BRAND = "#0b5d3b";
const GOLD = "#c99a2e";
const INK = "#0f1a14";
const MUTED = "#64716a";

function Label({ children }: { children: string }) {
  return <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: 2, color: MUTED, textTransform: "uppercase" }}>{children}</div>;
}

function Front({ s, qrSvg, stamp }: { s: Student; qrSvg: string; stamp?: string }) {
  const qr = `data:image/svg+xml;base64,${Buffer.from(qrSvg).toString("base64")}`;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", position: "relative", fontFamily: "Inter", color: INK, backgroundImage: "linear-gradient(160deg, #ffffff 0%, #f3f8f5 55%, #e9f2ec 100%)" }}>
      <div style={{ height: 140, background: BRAND, display: "flex", alignItems: "center", padding: "0 46px", gap: 28, borderBottom: `12px solid ${GOLD}` }}>
        <img src={LOGO} width={96} height={96} alt="" />
        <div style={{ display: "flex", flexDirection: "column", color: "#fff" }}>
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: 2 }}>UNIVERSITY OF UYO</div>
          <div style={{ fontSize: 22, letterSpacing: 5, opacity: 0.85 }}>STUDENT IDENTITY CARD</div>
        </div>
      </div>
      <div style={{ display: "flex", padding: "44px 46px 0", gap: 36 }}>
        <div style={{ width: 250, height: 312, borderRadius: 18, overflow: "hidden", border: "5px solid #ffffff", boxShadow: "0 0 0 2px #c9d4cd", display: "flex", background: "#e8efeb" }}>
          <img src={toBase64Uri(avatarUri(s.regNo, s.gender))} width={250} height={312} style={{ objectFit: "cover" }} alt="" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 14 }}>
          <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.1 }}>{fullName(s)}</div>
          <div style={{ display: "flex", flexDirection: "column" }}><Label>Reg. number</Label><div style={{ fontFamily: "Mono", fontSize: 34, fontWeight: 700, color: BRAND }}>{s.regNo}</div></div>
          <div style={{ display: "flex", flexDirection: "column" }}><Label>Department</Label><div style={{ fontSize: 29, fontWeight: 600 }}>{s.department}</div></div>
          <div style={{ display: "flex", flexDirection: "column" }}><Label>Level</Label><div style={{ fontSize: 29, fontWeight: 600 }}>{`${s.level} Level`}</div></div>
        </div>
        <div style={{ width: 236, height: 236, background: "#fff", borderRadius: 14, padding: 12, display: "flex" }}>
          <img src={qr} width={212} height={212} alt="" />
        </div>
      </div>
      <div style={{ position: "absolute", left: 46, right: 170, bottom: 34, display: "flex", justifyContent: "space-between", fontSize: 23, fontWeight: 600, color: MUTED }}>
        <span>{s.faculty}</span>
        <span>{`Expires ${fmtDate(s.idExpiresOn)}`}</span>
      </div>
      <div style={{ position: "absolute", right: 46, bottom: 26, width: 90, height: 90, borderRadius: 45, backgroundImage: "linear-gradient(135deg, #e9d48a, #9fe3c6, #a9c3f5, #f0b6d8)", border: "6px solid rgba(255,255,255,0.7)", display: "flex" }} />
      {stamp && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ transform: "rotate(-16deg)", fontSize: 110, fontWeight: 800, color: "rgba(192,53,43,0.35)", border: "10px solid rgba(192,53,43,0.35)", borderRadius: 24, padding: "0 40px" }}>{stamp}</div>
        </div>
      )}
    </div>
  );
}

function Back({ s }: { s: Student }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", fontFamily: "Inter", color: INK, backgroundImage: "linear-gradient(160deg, #ffffff 0%, #f3f8f5 100%)" }}>
      <div style={{ height: 90, background: "#1b2420", marginTop: 44 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "40px 50px", fontSize: 26, lineHeight: 1.45 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontWeight: 800 }}>If found, please return to:</div>
          <div>Office of the Registrar, University of Uyo, Uyo, Akwa Ibom State.</div>
        </div>
        <div>{`Issued ${fmtDate(s.idIssuedOn)} · Card version ${s.cardVersion} · Entry year ${s.entryYear}${s.bloodGroup ? ` · Blood group ${s.bloodGroup}` : ""}`}</div>
        <div>This card remains university property. Scan the QR code on the front to confirm it is genuine and current.</div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 18, width: 380 }}>
          <div style={{ fontSize: 44, fontWeight: 400, fontStyle: "normal", color: "#22302a", borderBottom: "3px solid #c9d4cd", paddingBottom: 4 }}>Registrar</div>
          <div style={{ fontSize: 18, color: MUTED, marginTop: 6 }}>AUTHORISED SIGNATURE</div>
        </div>
      </div>
    </div>
  );
}

/** Render one side of the student's card as a PNG (ArrayBuffer). */
export async function renderCardPng(side: "front" | "back", s: Student, qrSvg: string, stamp?: string): Promise<ArrayBuffer> {
  const res = new ImageResponse(side === "front" ? <Front s={s} qrSvg={qrSvg} stamp={stamp} /> : <Back s={s} />, { ...CARD_PX, fonts: FONTS });
  return res.arrayBuffer();
}
