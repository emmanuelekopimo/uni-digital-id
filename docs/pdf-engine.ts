/**
 * Small documentation engine: captures screenshots with Playwright, records the boxes of key
 * elements, then lays everything out as HTML with numbered callouts and prints it to PDF with Chromium.
 */
import { chromium, devices, type Browser, type Page } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type Callout = { selector: string; text: string; nth?: number; pad?: number };
export type Shot = {
  key: string;
  path: string;
  as?: string | null;
  mobile?: boolean;
  /** Height of the captured area in CSS pixels (desktop default 900). */
  height?: number;
  /** Scroll so this selector is near the top before capturing. */
  scrollTo?: string;
  prepare?: (page: Page) => Promise<void>;
  callouts: Callout[];
};
export type Captured = { key: string; png: string; width: number; height: number; mobile: boolean; boxes: { n: number; x: number; y: number; w: number; h: number; text: string }[] };

export async function capture(
  base: string,
  shots: Shot[],
  login: (page: Page, as: string) => Promise<void>,
  /** CSS applied before each capture, e.g. to stop sticky bars covering the shot. */
  captureCss = ".topbar{position:static!important}",
): Promise<Record<string, Captured>> {
  const browser: Browser = await chromium.launch();
  const out: Record<string, Captured> = {};
  const contexts = new Map<string, Page>();
  for (const s of shots) {
    const ctxKey = `${s.as ?? "anon"}-${s.mobile ? "m" : "d"}`;
    let page = contexts.get(ctxKey);
    if (!page) {
      const ctx = await browser.newContext(
        s.mobile ? { ...devices["Pixel 7"], deviceScaleFactor: 2 } : { viewport: { width: 1360, height: 900 }, deviceScaleFactor: 1.5 },
      );
      page = await ctx.newPage();
      if (s.as) await login(page, s.as);
      contexts.set(ctxKey, page);
    }
    const vh = s.mobile ? 840 : 900;
    const want = s.height ?? vh;
    await page.setViewportSize({ width: page.viewportSize()!.width, height: Math.max(vh, want) });
    await page.goto(base + s.path, { waitUntil: "networkidle" });
    if (s.prepare) await s.prepare(page);
    await page.waitForTimeout(400);
    const vw = page.viewportSize()!.width;
    const height = want;
    let offsetY = 0;
    if (s.scrollTo) {
      const b = await page.locator(s.scrollTo).first().boundingBox();
      const scrollY = await page.evaluate(() => window.scrollY);
      if (b) offsetY = Math.max(0, b.y + scrollY - 20);
    }
    const boxes: Captured["boxes"] = [];
    for (const [i, c] of s.callouts.entries()) {
      const loc = page.locator(c.selector).nth(c.nth ?? 0);
      const b = await loc.boundingBox();
      const scrollY = await page.evaluate(() => window.scrollY);
      if (!b) throw new Error(`Callout not found on ${s.key}: ${c.selector}`);
      const pad = c.pad ?? 4;
      boxes.push({ n: i + 1, x: b.x - pad, y: b.y + scrollY - offsetY - pad, w: b.width + pad * 2, h: b.height + pad * 2, text: c.text });
    }
    if (offsetY) await page.evaluate((y) => window.scrollTo(0, y), offsetY);
    await page.addStyleTag({ content: captureCss });
    const buf = await page.screenshot({ fullPage: true, clip: { x: 0, y: offsetY, width: vw, height } });
    out[s.key] = { key: s.key, png: buf.toString("base64"), width: vw, height, mobile: !!s.mobile, boxes };
    console.log(`captured ${s.key}`);
  }
  await browser.close();
  return out;
}

export function figure(c: Captured, caption: string, color: string) {
  const pct = (v: number, t: number) => `${((v / t) * 100).toFixed(3)}%`;
  const marks = c.boxes
    .map(
      (b) => `<div class="co-box" style="left:${pct(b.x, c.width)};top:${pct(b.y, c.height)};width:${pct(b.w, c.width)};height:${pct(b.h, c.height)};border-color:${color}"></div>
<div class="co-num" style="left:${pct(b.x, c.width)};top:${pct(b.y, c.height)};background:${color}">${b.n}</div>`,
    )
    .join("");
  const list = c.boxes.map((b) => `<li><span class="li-num" style="background:${color}">${b.n}</span><span>${b.text}</span></li>`).join("");
  return `<figure class="shot ${c.mobile ? "shot-m" : ""}"><div class="frame"><img src="data:image/png;base64,${c.png}"/>${marks}</div>
<figcaption>${caption}</figcaption><ol class="callouts">${list}</ol></figure>`;
}

export function fontFace(family: string, file: string, weight = "100 900", style = "normal") {
  const b64 = readFileSync(file).toString("base64");
  return `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${b64}) format("woff2");font-weight:${weight};font-style:${style};}`;
}

export async function printPdf(html: string, outPath: string, footerLabel: string) {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath.replace(/\.pdf$/, ".html"), html);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: outPath,
    format: "A4",
    printBackground: true,
    margin: { top: "16mm", bottom: "18mm", left: "15mm", right: "15mm" },
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: `<div style="font-size:8px;width:100%;padding:0 15mm;color:#888;display:flex;justify-content:space-between;font-family:sans-serif"><span>${footerLabel}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
  });
  await browser.close();
}

export function baseCss(o: { bg: string; ink: string; muted: string; line: string; accent: string; head: string; body: string; mono?: string }) {
  return `
*{box-sizing:border-box} body{margin:0;background:${o.bg};color:${o.ink};font-family:${o.body};font-size:10.5pt;line-height:1.55}
h1,h2,h3{font-family:${o.head};font-weight:600;line-height:1.2;margin:0 0 8px} h2{font-size:20pt;margin-top:4px} h3{font-size:13pt;margin-top:18px}
p{margin:0 0 9px} .muted{color:${o.muted}} code,pre{font-family:${o.mono ?? "monospace"};font-size:9pt}
pre{background:rgba(127,127,127,0.09);border:1px solid ${o.line};border-radius:8px;padding:10px 12px;white-space:pre-wrap;word-break:break-word}
.section{page-break-before:always} table{width:100%;border-collapse:collapse;margin:8px 0 12px;font-size:9.5pt}
th,td{border:1px solid ${o.line};padding:6px 8px;text-align:left;vertical-align:top} th{background:rgba(127,127,127,0.08)}
.shot{margin:12px 0 18px;page-break-inside:avoid} .frame{position:relative;border:1px solid ${o.line};border-radius:8px;overflow:hidden}
.frame img{display:block;width:100%} .shot-m .frame{width:58%;margin:0 auto} .shot-m figcaption{text-align:center}
.co-box{position:absolute;border:2.5px solid;border-radius:6px} .co-num{position:absolute;transform:translate(-45%,-45%);width:20px;height:20px;border-radius:50%;color:#fff;font:700 10.5px/20px sans-serif;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.35)}
figcaption{font-size:9.5pt;color:${o.muted};margin-top:6px;font-style:italic}
.callouts{list-style:none;padding:0;margin:8px 0 0;display:grid;gap:5px}
.callouts li{display:flex;gap:8px;align-items:flex-start;font-size:9.8pt} .li-num{flex:0 0 18px;height:18px;border-radius:50%;color:#fff;font:700 9.5px/18px sans-serif;text-align:center;margin-top:1px}
.cover{height:257mm;display:flex;flex-direction:column;justify-content:space-between}
.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:10px 0} .kpi{border:1px solid ${o.line};border-radius:8px;padding:10px 12px} .kpi b{font-size:18pt;display:block;font-family:${o.head}}
.toc li{margin:3px 0} .script td:first-child{white-space:nowrap;font-weight:600;width:70px}
.diagram{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:10px 0} .node{border:1.5px solid ${o.accent};border-radius:8px;padding:9px 10px;font-size:9.5pt} .node b{display:block;margin-bottom:3px}
`;
}
