import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const MM = 72 / 25.4;
/** ID-1 card size in points. */
export const CARD_PT = { w: 85.6 * MM, h: 53.98 * MM };

/**
 * A4 print sheet: front and back side by side at actual size, with crop marks,
 * so the card can be printed at 100%, cut out and laminated back to back.
 */
export async function buildCardPdf(front: ArrayBuffer, back: ArrayBuffer, meta: { name: string; regNo: string; generated: string }) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`UniUyo ID card - ${meta.regNo}`);
  pdf.setAuthor("University of Uyo");
  pdf.setSubject("Student identity card");
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.06, 0.1, 0.08);
  const muted = rgb(0.39, 0.44, 0.42);

  page.drawText("University of Uyo - Student identity card", { x: 56, y: 790, size: 15, font: bold, color: ink });
  page.drawText(`${meta.name}   ${meta.regNo}`, { x: 56, y: 770, size: 11, font, color: muted });

  const gap = 10 * MM;
  const x0 = (595.28 - (CARD_PT.w * 2 + gap)) / 2;
  const y0 = 600;
  const [f, b] = await Promise.all([pdf.embedPng(front), pdf.embedPng(back)]);
  const cards = [
    { img: f, x: x0, label: "FRONT" },
    { img: b, x: x0 + CARD_PT.w + gap, label: "BACK" },
  ];
  for (const c of cards) {
    page.drawImage(c.img, { x: c.x, y: y0, width: CARD_PT.w, height: CARD_PT.h });
    page.drawText(c.label, { x: c.x, y: y0 + CARD_PT.h + 8, size: 8, font: bold, color: muted });
    // Crop marks: short lines just outside each corner.
    const m = 4 * MM, o = 1.5 * MM;
    const corners: [number, number, number, number][] = [
      [c.x, y0, -1, -1], [c.x + CARD_PT.w, y0, 1, -1], [c.x, y0 + CARD_PT.h, -1, 1], [c.x + CARD_PT.w, y0 + CARD_PT.h, 1, 1],
    ];
    for (const [x, y, dx, dy] of corners) {
      page.drawLine({ start: { x: x + dx * o, y }, end: { x: x + dx * (o + m), y }, thickness: 0.4, color: ink });
      page.drawLine({ start: { x, y: y + dy * o }, end: { x, y: y + dy * (o + m) }, thickness: 0.4, color: ink });
    }
  }

  const lines = [
    "How to print",
    "1. Print this page at 100% (actual size). Do not choose 'Fit to page'.",
    "2. Cut along the crop marks. Each side measures 85.6 mm by 54 mm, the size of a bank card.",
    "3. Glue or laminate the back to the front.",
    "",
    "The QR code links to the university's verification page and is checked against the student register",
    "every time it is scanned. A printed copy stops working if the card is replaced or the student is suspended.",
    "",
    `Generated ${meta.generated}`,
  ];
  let y = y0 - 50;
  for (const [i, line] of lines.entries()) {
    page.drawText(line, { x: 56, y, size: i === 0 ? 12 : 10, font: i === 0 ? bold : font, color: i === 0 ? ink : muted });
    y -= i === 0 ? 20 : 15;
  }
  return pdf.save();
}
