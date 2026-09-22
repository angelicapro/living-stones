import crypto from "node:crypto";
export const id = (prefix = "id") => `${prefix}_${crypto.randomUUID()}`;
export const token = (bytes = 24) => crypto.randomBytes(bytes).toString("base64url");
export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
export function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}
export const hashRecord = (record) => sha256(`living-stones:v1:${stableStringify(record)}`);
