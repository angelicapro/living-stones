import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Store } from "./store.js";
import { Notifier } from "./notifications.js";
import { LivingStonesService } from "./domain.js";
import QRCode from "qrcode";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const store = new Store(process.env.DATA_FILE || path.join(root, "data/living-stones.json"));
const service = new LivingStonesService(store, new Notifier(store));
const json = (res, status, value) => { res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" }); res.end(JSON.stringify(value)); };
const body = async (req) => { const chunks = []; for await (const chunk of req) chunks.push(chunk); return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}; };
const route = (method, pattern, handler) => ({ method, pattern, handler });
const routes = [
  route("GET", /^\/api\/state$/, () => { const s = store.read(); return { labels: s.labels, envelopes: s.envelopes.map(({ receiptToken, activationToken, prayerRequest, ...e }) => e), services: s.services, pastoralCases: s.pastoralCases, seals: s.seals, outbox: s.outbox, audit: s.audit }; }),
  route("POST", /^\/api\/admin\/labels$/, async (req) => service.generateLabels(Number((await body(req)).count || 5))),
  route("GET", /^\/api\/labels\/([^/]+)\/qr$/, async (req, match) => {
    const label = store.read().labels.find((x) => x.id === match[1]); if (!label) throw new Error("Label not found");
    return { svg: await QRCode.toString(`${process.env.APP_BASE_URL || "http://localhost:3000"}/?activate=${label.activationToken}`, { type: "svg", margin: 1, width: 220 }) };
  }),
  route("POST", /^\/api\/envelopes\/([^/]+)\/activate$/, async (req, match) => { const e = service.activateEnvelope(match[1], await body(req)); return { shortCode: e.shortCode, receiptToken: e.receiptToken }; }),
  route("GET", /^\/api\/receipt\/([^/]+)$/, (req, match) => service.receipt(match[1])),
  route("POST", /^\/api\/receiver\/receive$/, async (req) => service.receiveEnvelope(await body(req))),
  route("POST", /^\/api\/receiver\/seal$/, async (req) => { const v = await body(req); return service.createSeal(v.serviceId, "RECEIPT", v.actor || "Receiver"); }),
  route("POST", /^\/api\/finance\/reconcile$/, async (req) => service.reconcile(await body(req))),
  route("POST", /^\/api\/finance\/resolve$/, async (req) => service.resolveVariance(await body(req))),
  route("POST", /^\/api\/finance\/seal$/, async (req) => { const v = await body(req); return service.createSeal(v.serviceId, "FINANCE", v.actor || "Finance"); }),
  route("POST", /^\/api\/pastoral\/([^/]+)$/, async (req, match) => service.updatePastoralCase(match[1], await body(req))),
  route("GET", /^\/api\/audit\/verify\/([^/]+)$/, (req, match) => service.verify(match[1])),
  route("POST", /^\/api\/demo\/tamper\/([^/]+)$/, async (req, match) => { if (process.env.ENABLE_TAMPER_DEMO === "false") throw new Error("Tamper demo is disabled"); return service.tamper(match[1], (await body(req)).amount); }),
  route("POST", /^\/api\/demo\/reset$/, () => { store.reset(); return { ok: true }; })
];

function staticFile(urlPath, res) {
  const requested = urlPath === "/" ? "index.html" : urlPath.slice(1);
  const publicRoot = path.join(root, "public"), filename = path.resolve(publicRoot, requested);
  if (!filename.startsWith(publicRoot) || !fs.existsSync(filename)) return false;
  const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml" };
  res.writeHead(200, { "Content-Type": types[path.extname(filename)] || "application/octet-stream" }); fs.createReadStream(filename).pipe(res); return true;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost"), candidate = routes.find((r) => r.method === req.method && r.pattern.test(url.pathname));
  try {
    if (candidate) { const match = url.pathname.match(candidate.pattern); return json(res, 200, await candidate.handler(req, match)); }
    if (staticFile(url.pathname, res)) return;
    json(res, 404, { error: "Not found" });
  } catch (error) { json(res, 400, { error: error.message }); }
});

if (process.env.NODE_ENV !== "test") server.listen(Number(process.env.PORT || 3000), () => console.log(`Living Stones running at http://localhost:${process.env.PORT || 3000}`));
export { server, service, store };
