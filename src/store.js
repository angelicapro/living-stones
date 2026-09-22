import fs from "node:fs";
import path from "node:path";
const emptyState = () => ({ labels: [], envelopes: [], services: [], pastoralCases: [], seals: [], outbox: [], audit: [] });
export class Store {
  constructor(filename) {
    this.filename = path.resolve(filename);
    fs.mkdirSync(path.dirname(this.filename), { recursive: true });
    if (!fs.existsSync(this.filename)) this.write(emptyState());
  }
  read() { return JSON.parse(fs.readFileSync(this.filename, "utf8")); }
  write(state) { const temp = `${this.filename}.tmp`; fs.writeFileSync(temp, JSON.stringify(state, null, 2)); fs.renameSync(temp, this.filename); }
  transact(mutator) { const state = this.read(); const result = mutator(state); this.write(state); return result; }
  reset() { this.write(emptyState()); }
}
