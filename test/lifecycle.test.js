import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Store } from "../src/store.js";
import { LivingStonesService } from "../src/domain.js";

function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "living-stones-"));
  const store = new Store(path.join(dir, "test.json"));
  return { store, app: new LivingStonesService(store), cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

test("complete cash journey creates two linked valid seals", (t) => {
  const { store, app, cleanup } = setup(); t.after(cleanup);
  const [label] = app.generateLabels(1);
  const envelope = app.activateEnvelope(label.activationToken, { name: "Test Donor", mobile: "+639171234567", givingType: "Tithe", paymentMethod: "CASH", declaredCash: 1000, consent: true });
  app.receiveEnvelope({ shortCode: envelope.shortCode, serviceId: "Sunday-AM", officer: "Receiver" });
  const receiptSeal = app.createSeal("Sunday-AM", "RECEIPT", "Receiver");
  app.reconcile({ shortCode: envelope.shortCode, countedCash: 1000, gcashConfirmed: 0, officer: "Counter" });
  const financeSeal = app.createSeal("Sunday-AM", "FINANCE", "Finance");
  assert.equal(financeSeal.linkedReceiptRoot, receiptSeal.merkleRoot);
  const verification = app.verify(envelope.id);
  assert.equal(verification.receipt.valid, true);
  assert.equal(verification.finance.valid, true);
  assert.equal(store.read().seals.length, 2);
});

test("variance requires review before Finance seal", (t) => {
  const { app, cleanup } = setup(); t.after(cleanup);
  const [label] = app.generateLabels(1);
  const e = app.activateEnvelope(label.activationToken, { name: "Donor", mobile: "+639170000000", givingType: "Offering", paymentMethod: "CASH", declaredCash: 500, consent: true });
  app.receiveEnvelope({ shortCode: e.shortCode, serviceId: "Evening", officer: "Receiver" }); app.createSeal("Evening", "RECEIPT", "Receiver");
  const reconciled = app.reconcile({ shortCode: e.shortCode, countedCash: 450, officer: "Counter" });
  assert.equal(reconciled.reconciliationStatus, "VARIANCE");
  assert.throws(() => app.createSeal("Evening", "FINANCE", "Finance"), /No envelopes/);
  app.resolveVariance({ shortCode: e.shortCode, reviewer: "Reviewer", resolution: "Count independently confirmed at 450" });
  assert.doesNotThrow(() => app.createSeal("Evening", "FINANCE", "Finance"));
});

test("tampering after sealing fails both integrity checks", (t) => {
  const { app, cleanup } = setup(); t.after(cleanup);
  const [label] = app.generateLabels(1);
  const e = app.activateEnvelope(label.activationToken, { name: "Donor", mobile: "+639170000000", givingType: "Mission", paymentMethod: "GCASH", declaredGcash: 750, gcashReference: "GC-123", consent: true });
  app.receiveEnvelope({ shortCode: e.shortCode, serviceId: "Sunday-PM", officer: "Receiver" }); app.createSeal("Sunday-PM", "RECEIPT", "Receiver");
  app.reconcile({ shortCode: e.shortCode, gcashConfirmed: 750, officer: "Counter" }); app.createSeal("Sunday-PM", "FINANCE", "Finance");
  app.tamper(e.id, 9999);
  const result = app.verify(e.id);
  assert.equal(result.receipt.valid, false); assert.equal(result.finance.valid, false);
});

test("pastoral cases separate normal prayer and urgent visitation", (t) => {
  const { store, app, cleanup } = setup(); t.after(cleanup);
  const labels = app.generateLabels(2);
  app.activateEnvelope(labels[0].activationToken, { name: "Member", mobile: "+639170000001", memberNumber: "M-10", givingType: "Tithe", paymentMethod: "CASH", declaredCash: 100, prayerRequest: "Please pray", consent: true });
  app.activateEnvelope(labels[1].activationToken, { name: "Visitor", mobile: "+639170000002", address: "Cavite", givingType: "Offering", paymentMethod: "CASH", declaredCash: 100, immediateVisitation: true, consent: true });
  const cases = store.read().pastoralCases;
  assert.equal(cases[0].priority, "NORMAL"); assert.equal(cases[0].assignmentBasis, "MEMBER_NUMBER");
  assert.equal(cases[1].priority, "URGENT"); assert.equal(cases[1].assignmentBasis, "LOCATION");
});
