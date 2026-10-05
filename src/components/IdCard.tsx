import QRCode from "qrcode";
import type { Student } from "@/db/schema";
import { makeIdToken, verifyUrl } from "@/lib/idtoken";
import { avatarUri } from "@/lib/avatar";
import { fmtDate } from "@/lib/format";
import { fullName } from "@/lib/verify";

export async function cardQr(s: Student, origin: string) {
  const url = verifyUrl(origin, makeIdToken(s.regNo, s.cardVersion));
  const svg = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0f1a14", light: "#ffffff" } });
  return { url, svg };
}

export function IdCardFront({ s, qr, stamp }: { s: Student; qr: { url: string; svg: string }; stamp?: string }) {
  return (
    <div className="idcard" data-testid="id-card" data-qr={qr.url}>
      <div className="top">
        <img src="/logo-white.svg" alt="" />
        <div><b>UNIVERSITY OF UYO</b><span>Student identity card</span></div>
      </div>
      <div className="body">
        <div className="face"><img src={avatarUri(s.regNo, s.gender)} alt={`Photo of ${s.firstName}`} /></div>
        <div style={{ minWidth: 0 }}>
          <div className="nm" data-testid="card-name">{fullName(s)}</div>
          <div className="kv"><span>Reg. number</span><b className="mono" data-testid="card-regno">{s.regNo}</b></div>
          <div className="kv"><span>Department</span><b>{s.department}</b></div>
          <div className="kv"><span>Level</span><b>{s.level} Level</b></div>
        </div>
        <div className="qr" dangerouslySetInnerHTML={{ __html: qr.svg }} aria-label="Verification QR code" />
      </div>
      <div className="strip"><span>{s.faculty}</span><span>Expires <b>{fmtDate(s.idExpiresOn)}</b></span></div>
      <div className="holo" aria-hidden />
      {stamp && <div className="void"><span>{stamp}</span></div>}
    </div>
  );
}

export function IdCardBack({ s }: { s: Student }) {
  return (
    <div className="idcard rear">
      <div className="mag" />
      <div className="rear-body">
        <div><b>If found, please return to:</b> Office of the Registrar, University of Uyo, Uyo, Akwa Ibom State.</div>
        <div>Issued {fmtDate(s.idIssuedOn)} · Card version {s.cardVersion} · Entry year {s.entryYear}{s.bloodGroup ? ` · Blood group ${s.bloodGroup}` : ""}</div>
        <div>This card remains university property. Scan the QR code on the front to confirm it is genuine and current.</div>
        <div className="sig">Registrar</div>
      </div>
    </div>
  );
}
