# Step 0 Pre-Check: Project Type Detection

## Detected Project Type
**Primary Type**: Full-Stack Enterprise Healthcare EMR & Hospital Operations Ecosystem (MERN Stack: Node.js/Express 5.1.0 + MongoDB/Mongoose 9.11.3 + Jitsi WebRTC + Vanilla JS/HTML5 Portals)
**Sub-Category**: Clinical Decision Support System (CDSS), Visual Ward/Bed Management, Multi-Tenant Medical Document & Imaging Store, Gamified Digital Therapeutics.

## Evidence
- **Backend Framework**: Express 5.1.0 (`VITALS/app.js`, `VITALS/package.json`), Body-Parser 2.2.0.
- **Database & ODM**: MongoDB, Mongoose 9.11.3, `connect-mongo` 5.1.0 for session persistence.
- **Security & RBAC**: `bcrypt` 6.0.0, `jsonwebtoken` 9.0.3, `express-validator` 7.3.2, `VITALS/services/securityService.js` (lockout handling, failed login counters).
- **Domain Modules**: 14 REST route modules (`VITALS/routes/patientRoutes.js`, `caseRoutes.js`, `clinicalRoutes.js`, `documentRoutes.js`, `planRoutes.js`, `decisionSupportRoutes.js`, `monitoringRoutes.js`, `alertsRoutes.js`, `analyticsRoutes.js`, `observabilityRoutes.js`).
- **Data Models**: 49 domain models (`User.js`, `Document.js`, `ImagingMetadata.js`, `ContraindicationRule.js`, `Appointment`, `Review`).
- **Testing**: Native Node.js test runner (`node --test`), Supertest 7.3.1, `mongodb-memory-server` 11.3.0 across 13 test suites.
- **Frontend**: Multi-portal client web application (`hospitalbed.html` cinema grid, `insurance.html` dynamic cost estimator, `SecureMeds.html.html` e-pharmacy tracker, `videoconsultation.html` Jitsi WebRTC, `xyzgame.html` stroke motor rehab).

## Documentation Track
- **Full Stack Track**: End-to-end data flow, database schemas, RBAC auth flows, HIPAA privacy architecture, medical imaging storage, real-time vital alerts, and clinical decision support rule engines.
