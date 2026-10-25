# Project Map: 24-repogenesis-healthcare

## Folder Structure
```
24-repogenesis-healthcare/
├── VITALS/                             # Full-Stack Hospital Application
│   ├── app.js                          # Express 5 application entry point & server setup
│   ├── package.json                    # Node.js dependencies & scripts
│   ├── seed.js                         # Database bootstrapping & default tenant seeding
│   ├── models/                         # 49 Mongoose schemas (User, Document, Imaging, Plan)
│   ├── routes/                         # 14 Express REST API route controllers
│   │   ├── patientRoutes.js            # Patient intake, demographic & history endpoints
│   │   ├── caseRoutes.js               # Clinical case management & triage
│   │   ├── clinicalRoutes.js           # Encounter notes, vitals & diagnosis logs
│   │   ├── decisionSupportRoutes.js    # CDSS contraindication & recommendation engine
│   │   ├── documentRoutes.js           # Medical report & DICOM metadata management
│   │   ├── planRoutes.js               # Longitudinal care & treatment plan builder
│   │   ├── monitoringRoutes.js         # Vital trend capture & automated threshold checks
│   │   ├── alertsRoutes.js             # High-priority clinical alert broadcast
│   │   ├── dashboardRoutes.js          # Ward occupancy & executive health metrics
│   │   ├── analyticsRoutes.js          # Departmental throughput & length-of-stay stats
│   │   └── observabilityRoutes.js      # System health probes, uptime & audit logs
│   ├── services/                       # Business logic & security utilities
│   │   └── securityService.js          # Password hashing, JWT signing, lockout management
│   ├── middleware/                     # Middleware chain (auth, usage tracking, error handler)
│   ├── tests/                          # 13 native node --test suites with Supertest
│   ├── hospitalbed.html                # Visual cinema-style bed reservation interface
│   ├── insurance.html                  # Surgical cost & insurance deductible calculator
│   ├── SecureMeds.html.html            # E-Pharmacy & digital prescription tracking portal
│   ├── videoconsultation.html          # Jitsi WebRTC telehealth consultation interface
│   ├── xyzgame.html                    # Gamified stroke motor rehab & panic recovery
│   └── arogyam.html                    # Aarogyam diagnostic encyclopedia & care cards
├── audit/                              # Project compliance audit reports
├── audit-logs/                         # System execution logs
└── docs/                               # VitePress documentation suite
```

## Tech Stack & Dependencies
- `express@^5.1.0`: Modern Express web framework with improved async error handling.
- `mongoose@^9.11.3`: Next-generation MongoDB object data modeling.
- `jsonwebtoken@^9.0.3`: Stateless access and refresh token signing and verification.
- `bcrypt@^6.0.0`: Secure salted cryptographic password hashing.
- `connect-mongo@^5.1.0`: Production-grade MongoDB-backed session store.
- `express-validator@^7.3.2`: Declarative request sanitization and schema validation.
- `supertest@^7.3.1`: HTTP assertion library for endpoint integration testing.
- `mongodb-memory-server@^11.3.0`: Ephemeral in-memory MongoDB instance for hermetic unit testing.
