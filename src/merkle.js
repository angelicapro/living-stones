import { sha256 } from "./crypto.js";
const combine = (left, right) => sha256(`${left}:${right}`);
export function buildMerkleTree(leaves) {
  if (!leaves.length) throw new Error("Cannot seal an empty batch");
  const levels = [[...leaves]];
  while (levels.at(-1).length > 1) {
    const current = levels.at(-1), next = [];
    for (let i = 0; i < current.length; i += 2) next.push(combine(current[i], current[i + 1] ?? current[i]));
    levels.push(next);
  }
  return { root: levels.at(-1)[0], levels };
}
export function createProof(tree, index) {
  const proof = []; let cursor = index;
  for (let level = 0; level < tree.levels.length - 1; level += 1) {
    const nodes = tree.levels[level], sibling = cursor % 2 === 0 ? cursor + 1 : cursor - 1;
    proof.push({ hash: nodes[sibling] ?? nodes[cursor], position: cursor % 2 === 0 ? "right" : "left" });
    cursor = Math.floor(cursor / 2);
  }
  return proof;
}
export function verifyProof(leaf, proof, expectedRoot) {
  let current = leaf;
  for (const step of proof) current = step.position === "left" ? combine(step.hash, current) : combine(current, step.hash);
  return current === expectedRoot;
}
