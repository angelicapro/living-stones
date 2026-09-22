# Testing Guide

## Start locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and adjust values if needed.
4. Run `npm start`.
5. Open `http://localhost:3000`.

The server persists PoC data in `data/living-stones.json`. Use **Reset demo data** in Admin to start again.

## End-to-end validation

1. In **Admin**, generate one or more envelope labels.
2. Open or scan a generated label.
3. Complete the guest donor form. Use a prayer request and immediate visitation to test both pastoral priorities.
4. Copy the envelope short code.
5. In **Receiver**, acknowledge it under `Sunday-AM`.
6. Close `Sunday-AM` to create the receipt seal.
7. In **Finance**, reconcile the cash/GCash amounts.
8. If the amounts differ, resolve the variance before continuing.
9. Create the linked Finance seal.
10. In **Auditor**, verify that both stages are valid.
11. Use **Tamper demo**, alter the declared amount, and verify again. Both checks should fail.

## Notifications

Without provider credentials, messages appear in the Admin outbox. For real delivery:

- Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER` for SMS.
- Set `RESEND_API_KEY` and a verified `EMAIL_FROM` for email.
- Set `APP_BASE_URL` to a URL reachable by the recipient.

Never commit `.env` or provider credentials.

## Automated checks

Run:

```bash
npm test
npm run check
```

The tests cover successful dual sealing, variance review, tamper detection, and pastoral priority/assignment.
