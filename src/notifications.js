export class Notifier {
  constructor(store, config = process.env) { this.store = store; this.config = config; }
  async sendReceipt(envelope) {
    const base = this.config.APP_BASE_URL || "http://localhost:3000";
    const link = `${base}/?receipt=${envelope.receiptToken}`;
    const text = `Living Stones: Your private giving receipt is ${link}`;
    const results = [];
    if (this.config.TWILIO_ACCOUNT_SID && this.config.TWILIO_AUTH_TOKEN && this.config.TWILIO_FROM_NUMBER) {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config.TWILIO_ACCOUNT_SID}/Messages.json`;
      const body = new URLSearchParams({ To: envelope.mobile, From: this.config.TWILIO_FROM_NUMBER, Body: text });
      const auth = Buffer.from(`${this.config.TWILIO_ACCOUNT_SID}:${this.config.TWILIO_AUTH_TOKEN}`).toString("base64");
      const response = await fetch(url, { method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" }, body });
      if (!response.ok) throw new Error(`Twilio failed: ${response.status}`);
      results.push({ channel: "SMS", status: "SENT" });
    } else results.push(this.queue("SMS", envelope.mobile, text));
    if (envelope.email) {
      if (this.config.RESEND_API_KEY) {
        const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${this.config.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: this.config.EMAIL_FROM, to: [envelope.email], subject: "Your private Living Stones receipt", text }) });
        if (!response.ok) throw new Error(`Resend failed: ${response.status}`);
        results.push({ channel: "EMAIL", status: "SENT" });
      } else results.push(this.queue("EMAIL", envelope.email, text));
    }
    return results;
  }
  queue(channel, destination, message) {
    const entry = { channel, destination, message, status: "LOCAL_OUTBOX", createdAt: new Date().toISOString() };
    this.store.transact((s) => s.outbox.push(entry)); return entry;
  }
}
