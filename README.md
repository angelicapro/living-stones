# Living Stones

Living Stones is a proof-of-concept church-giving system that connects QR-labelled physical envelopes with digital acknowledgment, financial reconciliation, pastoral care, and tamper-evident blockchain verification.

## PoC goals

- Let a donor complete a giving form without creating an account
- Support physical cash, manually entered GCash references, or both
- Send a private receipt link by SMS and optional email
- Record the envelope's chain of custody from donor to receiver to Finance
- Route prayer requests and urgent visitation requests privately
- Detect later modification of sealed giving records
- Demonstrate Merkle trees, smart contracts, and on-chain/off-chain design

## Core journey

1. The church prints a unique signed QR label for an envelope.
2. The donor scans it and completes a guest giving form.
3. A receiving officer acknowledges the physical envelope.
4. The receiver seals the post-service receipt batch on the blockchain.
5. Finance counts cash and validates GCash references.
6. Variances require a separate review.
7. Finance creates a second blockchain seal linked to the receipt seal.
8. Donors see simple **Receipt Verified** and **Finance Verified** badges.
9. Auditors can verify inclusion proofs and detect tampering.

## Privacy principle

Names, contact details, addresses, amounts, GCash references, prayer requests, and pastoral notes remain off-chain. The blockchain stores only cryptographic commitments and non-sensitive proof metadata.

## Documentation

- [Why blockchain adds value](docs/blockchain-value.md)
- [PoC architecture](docs/architecture.md)
- [Testing guide](docs/testing-guide.md)

## Status

Runnable PoC implemented. Follow the [testing guide](docs/testing-guide.md) to validate the complete journey locally.
