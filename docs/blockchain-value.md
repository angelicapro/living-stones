# Why Living Stones Uses Blockchain

## Executive summary

Living Stones uses blockchain as a **shared integrity and verification layer**, not as the database for donor information and not as a replacement for the church's receiving, counting, reconciliation, or pastoral processes.

The core value is straightforward: after a service batch has been sealed, the church can later prove that the included envelope records have not been silently changed. Donors receive a simple verified status, while authorized auditors can examine the underlying cryptographic evidence.

## The trust problem

A conventional database can provide permissions, logs, backups, and audit tables. However, a sufficiently privileged administrator—or an attacker using privileged credentials—may be able to alter both a giving record and its internal audit history.

This creates important questions:

- Was this the amount originally declared by the donor?
- Was this envelope included in the batch received after the service?
- Was the confirmed amount changed after Finance reconciled it?
- Was an audit entry edited or inserted later?
- Can an auditor verify integrity without relying only on the same application and database being audited?

Blockchain anchoring gives Living Stones an external, append-only reference against which later data can be verified.

## What is anchored

Living Stones does not publish individual giving records. It uses a Merkle tree to combine many record hashes into one batch-level Merkle root.

Only limited proof data is written on-chain:

- Batch identifier
- Merkle root
- Seal type
- Timestamp
- Reference to the preceding seal
- Smart-contract event or transaction identifier

The following remain off-chain:

- Donor name
- Address
- Email and mobile number
- Member number
- Giving amount and type
- GCash reference
- Prayer request
- Visitation request
- Pastoral notes
- Internal review evidence

This provides tamper evidence without publishing confidential donor or pastoral information.

## Why Merkle trees are useful

A Merkle tree allows hundreds or thousands of envelope records to be represented by one root hash.

For every sealed envelope, Living Stones retains a Merkle inclusion proof. The proof can show that the envelope's exact hashed state belonged to the sealed batch without exposing every other envelope.

Benefits include:

- One blockchain transaction can seal an entire service batch.
- Verification remains possible for one envelope at a time.
- Donor records are not individually published.
- On-chain storage and transaction costs stay small.
- Any change to an included record produces a different root and fails verification.

## Why there are two linked seals

Receiving and financial reconciliation occur at different times and prove different facts.

### Seal 1: Receipt seal

Created by the receiving officer after the service.

It proves:

- Which envelopes were acknowledged as received
- Their declared state at the receiving cutoff
- The service and receipt batch in which they were included
- That their sealed receipt state has not subsequently changed

It does **not** prove that cash was counted correctly or that a GCash reference was valid.

### Seal 2: Reconciliation seal

Created after Finance completes reconciliation and required variance reviews.

It proves:

- The counted cash amount or validated GCash result
- The final reconciliation status
- Documented variance outcomes
- The relationship between the reconciled state and the earlier receipt seal

The second seal includes a cryptographic reference to the first. This creates a verifiable chain:

**Received state → Finance-confirmed state**

A later attempt to change either stage becomes detectable.

## Business value

### Stronger donor confidence

Donors receive understandable **Receipt Verified** and **Finance Verified** statuses. They do not need to understand wallets, block hashes, or Merkle proofs.

### Independent auditability

An auditor can recompute a record hash, validate its inclusion proof, and compare the batch root with the blockchain. Verification is not limited to trusting a value returned by the operational database.

### Tamper-evident chain of custody

The system preserves distinct donor-declared, receiver-acknowledged, Finance-confirmed, and reviewer-resolved states.

### Clear accountability

Each seal establishes a cutoff. Changes after the cutoff cannot be disguised as the original sealed state.

### Cost-efficient verification

Batching many envelopes under a single Merkle root avoids publishing one blockchain transaction per donation.

### Privacy-conscious transparency

The system proves integrity without making donors, amounts, payment references, prayer requests, or visitation needs publicly visible.

### Portability of proof

The same verification approach can later support multiple services, branches, ministries, or an external auditor without duplicating confidential records on-chain.

## What blockchain does not solve

Blockchain should not be presented as proof that every submitted fact is true.

It does not:

- Prove that the donor entered the correct amount
- Count physical cash
- Confirm a GCash payment without reconciliation
- Prevent a receiver from making an incorrect acknowledgment
- Replace dual control, segregation of duties, or variance review
- Protect weak passwords or compromised staff devices
- Replace database backups, access controls, monitoring, or audit policies
- Make confidential information safe to publish on-chain

Blockchain proves that a particular digital state was sealed and has not been altered undetectably. Operational controls establish whether that state is accurate.

## Why a normal audit log is still required

Blockchain anchoring complements rather than replaces the application audit log.

The application must still record:

- Actor and role
- Timestamp
- Previous and new status
- Declared and confirmed values
- Reason for a change
- Variance evidence
- Reviewer decision
- Notification and delivery outcomes

The audit log explains **what happened**. The blockchain proof helps demonstrate that the sealed version has not been secretly rewritten.

## Privacy and security safeguards

- Use opaque, random envelope identifiers.
- Never place personal or pastoral data in QR codes.
- Never publish personal data or raw giving records on-chain.
- Hash a deterministic, versioned canonical representation of each sealed record.
- Use a domain separator or schema version to prevent ambiguous hashes.
- Encrypt sensitive off-chain fields at rest.
- Restrict pastoral data separately from financial data.
- Mask GCash references outside authorized Finance views.
- Use short-lived staff sessions and role-based access control.
- Protect private receipt links with high-entropy tokens and revocation.
- Record consent when personal information is collected.
- Define retention and deletion rules for off-chain personal data.

Deleting permitted off-chain personal data does not require deleting the blockchain root because the root is a one-way cryptographic commitment and contains no readable donor record.

## PoC learning value

The PoC is designed to make blockchain concepts concrete:

- SHA-256 record hashing
- Canonical data serialization
- Merkle-tree construction
- Inclusion-proof generation and verification
- Smart-contract events
- Linked batch commitments
- Digital signatures
- On-chain versus off-chain data separation
- Wallet and transaction mechanics
- Tamper-detection demonstrations

The key demonstration is to verify a sealed envelope successfully, change a protected value in the database, and show that verification then fails.

## Success criteria

Blockchain adds demonstrable value to the PoC when:

1. A receipt batch can be sealed with one Merkle root.
2. A Finance seal can cryptographically reference the receipt seal.
3. One envelope can be verified without disclosing other envelopes.
4. A legitimate unchanged record passes verification.
5. A modified sealed record fails verification.
6. No personal, payment, prayer, or pastoral information appears on-chain.
7. A donor sees simple verification badges.
8. An auditor can inspect the technical proof.
9. The application remains usable if blockchain submission is temporarily unavailable by safely queuing a pending seal.

## Decision statement

Living Stones uses blockchain because multiple parties need confidence in the integrity of records across separate handoffs. It uses blockchain narrowly—batch-level, privacy-preserving anchoring—because storing complete donations or donor identities on-chain would add cost, privacy risk, and unnecessary complexity without improving the church's operational controls.
