# Quality, Testing & Operations

## Automated Testing Strategy
- **Runner**: Node.js native test runner (`node --test`).
- **Assertion Engine**: Supertest for HTTP endpoint verification.
- **Database Mocking**: `mongodb-memory-server` providing isolated, ephemeral MongoDB instances for zero side-effect testing.
- **Test Suites (13 files)**:
  - `patient-intake.test.js`
  - `security-foundations.test.js`
  - `batch13-treatment-plan.test.js`
  - `batch14-decision-support.test.js`
  - `batch9-document-store.test.js`
