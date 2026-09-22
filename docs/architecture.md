# PoC Architecture

## Components

| Layer | PoC implementation | Production evolution |
|---|---|---|
| User interface | Responsive vanilla web application | React/Next.js or mobile application |
| API | Node.js HTTP server | Containerized Node.js service |
| Data | Atomic local JSON file | PostgreSQL with encryption and migrations |
| QR | Locally generated standards-compliant QR SVG | Same, with managed print batches |
| Integrity | SHA-256, deterministic records, Merkle proofs | Same cryptographic model |
| Seal ledger | Append-only local hash-linked ledger | `LivingStonesRegistry.sol` on an EVM network |
| Notifications | Twilio and Resend adapters | Approved church providers with delivery callbacks |

The local ledger lets the full workflow be tested without wallets or testnet funds. The Solidity contract defines the equivalent on-chain registry. Moving to an EVM network replaces the seal persistence adapter; envelope and pastoral data remain off-chain.

## Privacy boundaries

- Financial users do not receive prayer-request content through their workflow.
- Pastoral users do not need GCash references or reconciliation evidence.
- Auditors verify hashes and financial lifecycle data without routine access to pastoral notes.
- Public QR codes contain activation tokens, not donor data.
- Private receipt tokens are separate from public QR activation tokens.

## PoC security limitations

The staff tabs intentionally omit authentication so one tester can exercise all roles. Do not expose the PoC server publicly or use real donor data. Production requires SSO, role-based authorization, encryption, rate limiting, CSRF protection, secret management, retention rules, monitoring, and formal privacy review.
