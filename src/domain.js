import { buildMerkleTree, createProof, verifyProof } from "./merkle.js";
import { hashRecord, id, token } from "./crypto.js";
const now = () => new Date().toISOString();
const required = (v, field) => { if (v === undefined || v === null || String(v).trim() === "") throw new Error(`${field} is required`); return String(v).trim(); };
const money = (v, field) => { const n = Number(v); if (!Number.isFinite(n) || n < 0) throw new Error(`${field} must be a non-negative number`); return Math.round(n * 100) / 100; };

export function publicEnvelopeSnapshot(e, stage) {
  const base = { schemaVersion: 1, envelopeId: e.id, serviceId: e.serviceId, givingType: e.givingType, paymentMethod: e.paymentMethod, declaredCash: e.declaredCash, declaredGcash: e.declaredGcash };
  if (stage === "RECEIPT") return { ...base, receivedAt: e.receivedAt, receiptStatus: e.status };
  return { ...base, receiptSealId: e.receiptSealId, countedCash: e.countedCash, gcashConfirmed: e.gcashConfirmed, reconciliationStatus: e.reconciliationStatus, varianceResolution: e.varianceResolution || null };
}

export class LivingStonesService {
  constructor(store, notifier = { sendReceipt: async () => {} }) { this.store = store; this.notifier = notifier; }
  audit(s, actor, action, entityType, entityId, details = {}) { s.audit.push({ id: id("audit"), actor, action, entityType, entityId, details, at: now() }); }

  generateLabels(count = 5) {
    if (!Number.isInteger(count) || count < 1 || count > 100) throw new Error("Count must be between 1 and 100");
    return this.store.transact((s) => {
      const labels = Array.from({ length: count }, (_, i) => {
        const label = { id: id("env"), shortCode: `LS-${Date.now().toString(36).toUpperCase()}-${String(i + 1).padStart(3, "0")}`, activationToken: token(18), status: "AVAILABLE", createdAt: now() };
        s.labels.push(label); return label;
      });
      this.audit(s, "admin", "LABELS_GENERATED", "label_batch", labels[0].id, { count }); return labels;
    });
  }

  activateEnvelope(activationToken, input) {
    const envelope = this.store.transact((s) => {
      const label = s.labels.find((x) => x.activationToken === activationToken);
      if (!label) throw new Error("Envelope QR is invalid");
      if (label.status !== "AVAILABLE") throw new Error("Envelope has already been activated");
      const paymentMethod = required(input.paymentMethod, "Payment method");
      const declaredCash = money(input.declaredCash || 0, "Cash amount"), declaredGcash = money(input.declaredGcash || 0, "GCash amount");
      if (declaredCash + declaredGcash <= 0) throw new Error("A giving amount is required");
      if (paymentMethod.includes("GCASH") && !String(input.gcashReference || "").trim()) throw new Error("GCash reference is required");
      if (input.immediateVisitation && !String(input.address || "").trim()) throw new Error("Address is required for immediate visitation");
      if (!input.consent) throw new Error("Privacy consent is required");
      const e = {
        id: label.id, shortCode: label.shortCode, activationToken, receiptToken: token(28),
        name: required(input.name, "Name"), mobile: required(input.mobile, "Mobile number"), email: String(input.email || "").trim(),
        address: String(input.address || "").trim(), memberNumber: String(input.memberNumber || "").trim(), givingType: required(input.givingType, "Giving type"),
        paymentMethod, declaredCash, declaredGcash, gcashReference: String(input.gcashReference || "").trim(), prayerRequest: String(input.prayerRequest || "").trim(),
        immediateVisitation: Boolean(input.immediateVisitation), consent: true, status: "PREPARED", reconciliationStatus: "PENDING", createdAt: now()
      };
      s.envelopes.push(e); label.status = "ACTIVATED";
      if (e.prayerRequest || e.immediateVisitation) {
        const basis = e.memberNumber ? "MEMBER_NUMBER" : e.address ? "LOCATION" : "ADMIN_QUEUE";
        s.pastoralCases.push({ id: id("care"), envelopeId: e.id, name: e.name, mobile: e.mobile, address: e.address, memberNumber: e.memberNumber,
          prayerRequest: e.prayerRequest, immediateVisitation: e.immediateVisitation, priority: e.immediateVisitation ? "URGENT" : "NORMAL", assignmentBasis: basis,
          assignee: basis === "MEMBER_NUMBER" ? `Leader for ${e.memberNumber}` : basis === "LOCATION" ? `Leader for ${e.address}` : "Unassigned", status: "NEW", createdAt: now() });
      }
      this.audit(s, "guest donor", "ENVELOPE_PREPARED", "envelope", e.id, { shortCode: e.shortCode }); return e;
    });
    this.notifier.sendReceipt(envelope).catch(() => {}); return envelope;
  }

  receiveEnvelope(input) {
    return this.store.transact((s) => {
      const e = s.envelopes.find((x) => x.shortCode === input.shortCode); if (!e) throw new Error("Envelope not found");
      if (e.status !== "PREPARED") throw new Error(`Envelope cannot be received from ${e.status}`);
      e.status = "RECEIVED"; e.serviceId = required(input.serviceId, "Service"); e.receivedAt = now(); e.receivedBy = required(input.officer, "Receiving officer"); e.location = String(input.location || "Main church");
      if (!s.services.some((x) => x.id === e.serviceId)) s.services.push({ id: e.serviceId, status: "OPEN", createdAt: now() });
      this.audit(s, e.receivedBy, "ENVELOPE_RECEIVED", "envelope", e.id, { serviceId: e.serviceId }); return e;
    });
  }

  createSeal(serviceId, type, actor) {
    return this.store.transact((s) => {
      const service = s.services.find((x) => x.id === serviceId); if (!service) throw new Error("Service not found");
      const receipt = type === "RECEIPT";
      const envelopes = s.envelopes.filter((e) => e.serviceId === serviceId && (receipt ? e.status === "RECEIVED" && !e.receiptSealId : ["RECONCILED", "RESOLVED"].includes(e.reconciliationStatus) && !e.financeSealId));
      if (!envelopes.length) throw new Error(`No envelopes are ready for a ${type.toLowerCase()} seal`);
      const leaves = envelopes.map((e) => hashRecord(publicEnvelopeSnapshot(e, type))), tree = buildMerkleTree(leaves);
      const receiptSeal = receipt ? null : s.seals.find((x) => x.serviceId === serviceId && x.type === "RECEIPT");
      if (!receipt && !receiptSeal) throw new Error("Receipt seal must exist before Finance seal");
      const seal = { id: id("seal"), serviceId, type, merkleRoot: tree.root, linkedReceiptRoot: receiptSeal?.merkleRoot || null,
        previousLedgerHash: s.seals.at(-1)?.ledgerHash || "GENESIS", envelopeCount: envelopes.length, actor, createdAt: now() };
      seal.ledgerHash = hashRecord(seal); s.seals.push(seal);
      envelopes.forEach((e, i) => { const p = receipt ? "receipt" : "finance"; e[`${p}SealId`] = seal.id; e[`${p}LeafHash`] = leaves[i]; e[`${p}Proof`] = createProof(tree, i); });
      service.status = receipt ? "RECEIPT_SEALED" : "FINANCE_SEALED";
      this.audit(s, actor, `${type}_BATCH_SEALED`, "service", serviceId, { root: tree.root, count: envelopes.length }); return seal;
    });
  }

  reconcile(input) {
    return this.store.transact((s) => {
      const e = s.envelopes.find((x) => x.shortCode === input.shortCode); if (!e?.receiptSealId) throw new Error("Envelope must be receipt-sealed before reconciliation");
      e.countedCash = money(input.countedCash || 0, "Counted cash"); e.gcashConfirmed = money(input.gcashConfirmed || 0, "Confirmed GCash");
      e.financeOfficer = required(input.officer, "Finance officer"); e.reconciledAt = now();
      const declared = e.declaredCash + e.declaredGcash, confirmed = e.countedCash + e.gcashConfirmed;
      e.variance = Math.round((confirmed - declared) * 100) / 100; e.reconciliationStatus = e.variance === 0 ? "RECONCILED" : "VARIANCE";
      this.audit(s, e.financeOfficer, "ENVELOPE_RECONCILED", "envelope", e.id, { declared, confirmed, variance: e.variance }); return e;
    });
  }

  resolveVariance(input) {
    return this.store.transact((s) => {
      const e = s.envelopes.find((x) => x.shortCode === input.shortCode); if (e?.reconciliationStatus !== "VARIANCE") throw new Error("Envelope has no open variance");
      e.varianceResolution = required(input.resolution, "Resolution"); e.reviewedBy = required(input.reviewer, "Reviewer"); e.reviewedAt = now(); e.reconciliationStatus = "RESOLVED";
      this.audit(s, e.reviewedBy, "VARIANCE_RESOLVED", "envelope", e.id, { resolution: e.varianceResolution }); return e;
    });
  }

  updatePastoralCase(caseId, input) {
    return this.store.transact((s) => {
      const c = s.pastoralCases.find((x) => x.id === caseId); if (!c) throw new Error("Pastoral case not found");
      c.assignee = String(input.assignee || c.assignee); c.status = String(input.status || c.status); c.notes = String(input.notes || c.notes || ""); c.updatedAt = now();
      this.audit(s, c.assignee, "PASTORAL_CASE_UPDATED", "pastoral_case", caseId, { status: c.status }); return c;
    });
  }

  receipt(receiptToken) {
    const e = this.store.read().envelopes.find((x) => x.receiptToken === receiptToken); if (!e) throw new Error("Private receipt link is invalid");
    return { shortCode: e.shortCode, name: e.name, givingType: e.givingType, declaredTotal: e.declaredCash + e.declaredGcash, status: e.status,
      reconciliationStatus: e.reconciliationStatus, receiptVerified: Boolean(e.receiptSealId), financeVerified: Boolean(e.financeSealId), variance: e.reconciliationStatus === "VARIANCE" ? "Under review" : null };
  }

  verify(envelopeId) {
    const s = this.store.read(), e = s.envelopes.find((x) => x.id === envelopeId); if (!e) throw new Error("Envelope not found");
    const stage = (name) => { const p = name === "RECEIPT" ? "receipt" : "finance", seal = s.seals.find((x) => x.id === e[`${p}SealId`]); if (!seal) return { sealed: false, valid: false };
      const currentHash = hashRecord(publicEnvelopeSnapshot(e, name)); return { sealed: true, valid: currentHash === e[`${p}LeafHash`] && verifyProof(currentHash, e[`${p}Proof`], seal.merkleRoot), storedHash: e[`${p}LeafHash`], currentHash, merkleRoot: seal.merkleRoot, sealId: seal.id }; };
    return { envelopeId, shortCode: e.shortCode, receipt: stage("RECEIPT"), finance: stage("FINANCE") };
  }

  tamper(envelopeId, amount) { return this.store.transact((s) => { const e = s.envelopes.find((x) => x.id === envelopeId); if (!e) throw new Error("Envelope not found"); e.declaredCash = money(amount, "Tampered amount"); return e; }); }
}
