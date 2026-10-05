import QRCode from "qrcode";
import type { Student } from "@/db/schema";
import { makeIdToken, verifyUrl } from "@/lib/idtoken";
import { avatarUri } from "@/lib/avatar";
import { fmtDate } from "@/lib/format";
import { fullName } from "@/lib/verify";

export async function IdCardFront({ s, origin, void: isVoid }: { s: Student; origin: string; void?: string }) {
  const url = verifyUrl(origin, makeIdToken(s.regNo, s.cardVersion));
  const svg = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0d0d0d", light: "#ffffff" } });
  return (
    <div className="idcard" data-testid="id-card" data-qr={url}>
      <div className="band">
        <img src="/logo.svg" alt="" />
        <div><b>UNIVERSITY OF UYO</b><span>Student identity card</span></div>
      </div>
      <div className="stripe" />
      <div className="inner">
        <div className="photo"><img src={avatarUri(s.regNo, s.gender)} alt={`Photo of ${s.firstName}`} /></div>
        <div style={{ minWidth: 0 }}>
          <div className="name" data-testid="card-name">{fullName(s)}</div>
          <div className="field"><span>Reg. number</span><b data-testid="card-regno">{s.regNo}</b></div>
          <div className="field"><span>Department</span><b>{s.department}</b></div>
          <div className="field"><span>Level</span><b>{s.level} Level</b></div>
        </div>
        <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} aria-label="Verification QR code" />
      </div>
      <div className="foot"><span>{s.faculty}</span><span>Expires {fmtDate(s.idExpiresOn)}</span></div>
      {isVoid && <div className="void"><span>{isVoid}</span></div>}
    </div>
  );
}

export function IdCardBack({ s }: { s: Student }) {
  return (
    <div className="idcard back">
      <div className="band"><img src="/logo.svg" alt="" /><div><b>IF FOUND, PLEASE RETURN</b><span>Registrar, University of Uyo, Akwa Ibom</span></div></div>
      <div className="stripe" />
      <div className="inner">
        <h4>Card details</h4>
        <div>Issued: {fmtDate(s.idIssuedOn)} · Card version {s.cardVersion}</div>
        <div>Entry year: {s.entryYear} · Gender: {s.gender === "F" ? "Female" : "Male"}{s.bloodGroup ? ` · Blood group: ${s.bloodGroup}` : ""}</div>
        <div style={{ marginTop: "2cqi" }}>This card remains the property of the University of Uyo. Scan the QR code to confirm it is genuine and current.</div>
        <div className="sig">Registrar</div>
      </div>
    </div>
  );
}
