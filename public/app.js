const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
const notice = (message, error = false) => { $("#notice").innerHTML = `<div class="notice ${error ? "error" : ""}">${escapeHtml(message)}</div>`; setTimeout(() => $("#notice").replaceChildren(), 5000); };
const escapeHtml = (v = "") => String(v).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]);
const formObject = (form) => Object.fromEntries(new FormData(form).entries());
async function api(url, options = {}) { const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options }); const data = await res.json(); if (!res.ok || data.error) throw new Error(data.error || "Request failed"); return data; }
async function submit(form, url, transform = (v) => v) { try { const data = await api(url, { method: "POST", body: JSON.stringify(transform(formObject(form))) }); notice("Saved successfully"); await refresh(); return data; } catch (e) { notice(e.message, true); throw e; } }

function selectTab(name) { $$(".panel").forEach((x) => x.classList.toggle("active", x.id === name)); $$("#tabs button").forEach((x) => x.classList.toggle("active", x.dataset.tab === name)); }
$$("#tabs button").forEach((button) => button.onclick = () => selectTab(button.dataset.tab));

$("#donorForm").onsubmit = async (event) => {
  event.preventDefault(); const token = event.target.elements.activationToken.value; if (!token) return notice("Open a generated envelope label first.", true);
  const result = await submit(event.target, `/api/envelopes/${token}/activate`, (v) => ({ ...v, immediateVisitation: Boolean(event.target.elements.immediateVisitation.checked), consent: Boolean(event.target.elements.consent.checked) }));
  history.replaceState({}, "", `/?receipt=${result.receiptToken}`); await showReceipt(result.receiptToken);
};
$("#receiveForm").onsubmit = (e) => { e.preventDefault(); submit(e.target, "/api/receiver/receive"); };
$("#receiptSealForm").onsubmit = (e) => { e.preventDefault(); submit(e.target, "/api/receiver/seal"); };
$("#reconcileForm").onsubmit = (e) => { e.preventDefault(); submit(e.target, "/api/finance/reconcile"); };
$("#resolveForm").onsubmit = (e) => { e.preventDefault(); submit(e.target, "/api/finance/resolve"); };
$("#financeSealForm").onsubmit = (e) => { e.preventDefault(); submit(e.target, "/api/finance/seal"); };
$("#labelForm").onsubmit = (e) => { e.preventDefault(); submit(e.target, "/api/admin/labels", (v) => ({ count: Number(v.count) })); };
$("#resetButton").onclick = async () => { if (confirm("Reset all local PoC data?")) { await api("/api/demo/reset", { method: "POST", body: "{}" }); notice("Demo data reset"); await refresh(); } };

async function showReceipt(token) {
  try { const r = await api(`/api/receipt/${token}`); selectTab("donor"); $("#donorForm").style.display = "none"; $("#activationHint").style.display = "none";
    $("#receiptCard").innerHTML = `<article class="card"><p class="eyebrow">PRIVATE RECEIPT</p><h2>Thank you, ${escapeHtml(r.name)}</h2><p><strong>${escapeHtml(r.shortCode)}</strong> · ${escapeHtml(r.givingType)} · ₱${r.declaredTotal.toLocaleString()}</p><div class="meta"><span class="status">${escapeHtml(r.status)}</span><span class="status ${r.receiptVerified ? "" : "bad"}">${r.receiptVerified ? "Receipt Verified" : "Receipt seal pending"}</span><span class="status ${r.financeVerified ? "" : "bad"}">${r.financeVerified ? "Finance Verified" : "Finance verification pending"}</span></div>${r.variance ? `<p class="callout">Variance is under review.</p>` : ""}</article>`;
  } catch (e) { notice(e.message, true); }
}

async function renderLabels(labels) {
  $("#labels").innerHTML = "";
  for (const label of labels) {
    let svg = ""; try { svg = (await api(`/api/labels/${label.id}/qr`)).svg; } catch {}
    const url = `${location.origin}/?activate=${label.activationToken}`;
    $("#labels").insertAdjacentHTML("beforeend", `<article class="label-card">${svg}<strong>${escapeHtml(label.shortCode)}</strong><small>Scan to prepare envelope</small><p><a href="${url}">Open form</a></p><span class="status">${escapeHtml(label.status)}</span></article>`);
  }
}

function renderPastoral(cases) {
  $("#pastoralList").innerHTML = cases.length ? cases.map((c) => `<article class="card"><div class="section-title"><div><strong>${escapeHtml(c.name)}</strong><div class="meta">${escapeHtml(c.mobile)} · ${escapeHtml(c.assignmentBasis)}</div></div><span class="status ${c.priority === "URGENT" ? "bad" : ""}">${escapeHtml(c.priority)}</span></div><p>${escapeHtml(c.prayerRequest || "Immediate visitation requested")}</p><form class="pastoral-form" data-id="${c.id}"><label>Assigned leader<input name="assignee" value="${escapeHtml(c.assignee)}"></label><label>Status<select name="status">${["NEW","ASSIGNED","ACKNOWLEDGED","IN_PROGRESS","CLOSED"].map((s) => `<option ${s === c.status ? "selected" : ""}>${s}</option>`).join("")}</select></label><label>Confidential notes<textarea name="notes">${escapeHtml(c.notes || "")}</textarea></label><button>Update care case</button></form></article>`).join("") : `<div class="callout">No prayer or visitation requests yet.</div>`;
  $$(".pastoral-form").forEach((form) => form.onsubmit = (e) => { e.preventDefault(); submit(form, `/api/pastoral/${form.dataset.id}`); });
}

function renderAudit(envelopes) {
  $("#auditList").innerHTML = envelopes.length ? envelopes.map((e) => `<article class="card"><div class="section-title"><div><strong>${escapeHtml(e.shortCode)}</strong><div class="meta">${escapeHtml(e.givingType)} · ${escapeHtml(e.serviceId || "Not received")}</div></div><span class="status">${escapeHtml(e.reconciliationStatus)}</span></div><div class="inline"><button class="verify" data-id="${e.id}">Verify integrity</button><button class="tamper danger" data-id="${e.id}" data-current="${e.declaredCash}">Tamper demo</button></div><div id="proof-${e.id}"></div></article>`).join("") : `<div class="callout">No envelope records yet.</div>`;
  $$(".verify").forEach((b) => b.onclick = async () => { try { const v = await api(`/api/audit/verify/${b.dataset.id}`); $(`#proof-${b.dataset.id}`).innerHTML = `<p><span class="status ${v.receipt.valid ? "" : "bad"}">Receipt: ${v.receipt.valid ? "VALID" : "INVALID / UNSEALED"}</span> <span class="status ${v.finance.valid ? "" : "bad"}">Finance: ${v.finance.valid ? "VALID" : "INVALID / UNSEALED"}</span></p>${v.receipt.currentHash ? `<div class="hash">Current hash: ${v.receipt.currentHash}<br>Receipt root: ${v.receipt.merkleRoot}</div>` : ""}`; } catch (e) { notice(e.message, true); } });
  $$(".tamper").forEach((b) => b.onclick = async () => { const amount = prompt("Enter a forged declared cash amount", String(Number(b.dataset.current) + 100)); if (amount !== null) { await api(`/api/demo/tamper/${b.dataset.id}`, { method: "POST", body: JSON.stringify({ amount }) }); notice("Record changed outside the normal workflow. Run verification again.", true); await refresh(); } });
}

async function refresh() {
  const s = await api("/api/state"); await renderLabels(s.labels); renderPastoral(s.pastoralCases); renderAudit(s.envelopes);
  $("#outbox").innerHTML = s.outbox.length ? s.outbox.map((o) => `<article class="card"><strong>${escapeHtml(o.channel)}</strong> → ${escapeHtml(o.destination)}<p>${escapeHtml(o.message)}</p><span class="status">${escapeHtml(o.status)}</span></article>`).join("") : `<div class="callout">No queued messages. When provider credentials are absent, test messages appear here.</div>`;
}

const params = new URLSearchParams(location.search), activation = params.get("activate"), receipt = params.get("receipt");
if (activation) { $("#donorForm").elements.activationToken.value = activation; $("#activationHint").textContent = "Envelope QR accepted. Complete the form to activate this envelope."; selectTab("donor"); }
else if (receipt) showReceipt(receipt); else selectTab("donor");
refresh().catch((e) => notice(e.message, true));
