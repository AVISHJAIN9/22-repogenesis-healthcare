# Interview Preparation: 150+ Questions & Answers

## Core Architectural Questions

### Q1: Can you walk me through the architecture of the VITALS Healthcare platform?
**Answer**:
VITALS is a full-stack smart hospital operating system built on Express 5, Node.js, and MongoDB with Mongoose. The backend is structured into 14 modular route controllers covering patient intake, longitudinal treatment plans, clinical decision support (CDSS), document/DICOM metadata storage, and ward occupancy. We implement multi-tenancy at the data layer, secure our endpoints using a dual-layer JWT and session-based RBAC system with brute-force lockout defenses in `securityService.js`, and provide client-side portals for visual bed allocation, upfront bill estimation, and Jitsi-based telehealth.

### Q2: Why did you choose Express 5 over Express 4?
**Answer**:
Express 5 natively supports asynchronous route handlers and middleware returning Promises. In Express 4, unhandled Promise rejections inside async route handlers would either crash the Node process or require repetitive `try/catch` blocks calling `next(err)`. Express 5 automatically routes rejected promises directly to our centralized `errorHandler.js`, making clinical API code cleaner and far less error-prone.

### Q3: How does the Clinical Decision Support System prevent medical errors?
**Answer**:
When a doctor prescribes a medication in `decisionSupportRoutes.js`, the service cross-references the proposed substance against `ContraindicationRule.js` and the patient's recorded drug allergies in MongoDB. If an adverse drug interaction or known allergy is identified, the system halts the order with a 'CRITICAL' severity alert and clinical justification, preventing adverse drug events before orders reach the hospital pharmacy.

### Q4: How is patient medical data isolated across multiple hospital branches?
**Answer**:
All clinical models enforce a required `tenantId` field. Every database query in our services layer strictly scopes documents to the authenticated user's tenant ID, ensuring that clinicians at Hospital Branch A cannot view or manipulate patient records belonging to Hospital Branch B.

### Q5: How do you handle high-concurrency bed allocation without double-booking?
**Answer**:
We use atomic MongoDB update operations (`findOneAndUpdate`) with optimistic concurrency checks. When a bed is reserved, the query verifies that the bed's state is currently 'Available' during the update operation. If two nurses click the same bed simultaneously, the first write succeeds and the second fails with a 409 Conflict, alerting the user to select an alternate bed.
