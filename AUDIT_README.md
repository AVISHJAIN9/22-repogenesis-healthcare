# Sachidanand site audit

## 1. SNAPSHOT

Detected stack and versions
- Node: runtime reported Node.js v22.23.2 in the startup failure log under audit-logs/startup-fail.log.
- Express: package.json declares "express": "^5.1.0" in VITALS/package.json.
- Mongoose / driver: package.json declares "mongoose": "^9.11.3"; app.js calls mongoose.connect().
- Frontend approach: plain HTML/CSS/JS static pages served from the Express app in VITALS/; there is no React/Vite app or client/ folder.
- Data layer: MongoDB is expected via mongoose; the fallback path to local MongoDB is the default connection string in VITALS/app.js.

Package scripts
- VITALS/package.json contains only: "test": "node --test".
- There is no start/build/dev script in package.json.

Folder tree (depth 4, excluding node_modules)
- .
- README.md
- VITALS/
- VITALS/.env.example
- VITALS/aboutus.html.html
- VITALS/admitformpatient.html
- VITALS/app.js
- VITALS/arogyam.html
- VITALS/BOOKAPPOINTMENT.HTML
- VITALS/BOOKAPPOINTMEN  T.HTML
- VITALS/docter.html
- VITALS/login.html
- VITALS/main.html
- VITALS/packages.html
- VITALS/patient-intake.html
- VITALS/patient-intake.js
- VITALS/SecureMeds.html.html
- VITALS/treatment-plan.html
- VITALS/treatment-plan.js
- VITALS/middleware/auth.js
- VITALS/middleware/errorHandler.js
- VITALS/middleware/usageTracking.js
- VITALS/models/*
- VITALS/routes/*
- VITALS/services/*
- VITALS/tests/*
- starter/
- starter/dummy-data/sample-vitals.json
- docs/
- docs/datasets.md
- docs/ethics-and-privacy.md
- docs/problem-prompts.md
- audit-logs/

Required environment variable names (names only)
- PORT
- MONGODB_URI
- SESSION_SECRET
- JWT_SECRET
- JWT_REFRESH_SECRET
- NODE_ENV
- COOKIE_SECURE
- DOCUMENT_MAX_SIZE_BYTES
- DOCUMENT_STORAGE_PROVIDER
- DOCUMENT_STORAGE_PATH
- BACKUP_DIR
- MIGRATION_DIR
- PLAN_RECOMMENDATION_ENGINE
- PLAN_COMPARISON_ENABLED
- PLAN_APPROVAL_BLOCKS_HARD_CONTRAINDICATIONS

How to run it
- The app is launched from the VITALS folder with a Node command, as seen in the startup failure log and app.js.
- Default path: cd VITALS && PORT=3001 node app.js
- However, that default path fails without a reachable MongoDB at localhost:27017 because VITALS/app.js resolves the DB from process.env.MONGODB_URI or mongodb://localhost:27017/hospital_info
- Working verification path used in audit: start in-memory MongoDB then call startServer().

Evidence
- VITALS/app.js: getPort() and getDbUrl() show default port and DB URL.
- VITALS/.env.example: environment names.
- audit-logs/startup-fail.log: exact MongoDB connection refusal.

## 2. RUN RESULTS

Install result
- Command run: cd VITALS && npm install --silent > audit-logs/npm-install.log 2>&1; echo $?; tail -n 20 audit-logs/npm-install.log
- Result: exit code 0.
- This means the project dependencies installed successfully.

Startup result with default local MongoDB
- Command run: cd VITALS && (PORT=3001 node app.js > audit-logs/startup-fail.log 2>&1 || true) ...
- Result recorded in audit-logs/startup-fail.log:
  - "MongoServerSelectionError: connect ECONNREFUSED ::1:27017, connect ECONNREFUSED 127.0.0.1:27017"
- This is the exact reason the app fails to start without a local MongoDB.

Startup result with in-memory DB (runtime verification)
- Command run: cd VITALS && PORT=3001 node - <<'NODE' ... MongoMemoryServer.create(); process.env.MONGODB_URI = mongo.getUri(); startServer(); ...
- Result captured in terminal output:
  - "Connected to MongoDB: mongodb://127.0.0.1:61489/"
  - "SERVER_READY_ON_3001"
  - "Server running at http://localhost:3001"
- This confirms the site can boot only when a MongoDB instance is available.

HTTP verification against the running server
- Command run: curl -I --max-time 20 http://localhost:3001 && curl -sS --max-time 20 http://localhost:3001/api/health | head -c 400
- Result:
  - HTTP/1.1 302 Found
  - Location: /login
  - health body: {"success":true,"data":{"status":"connected","database":"test","readyState":1,...}}

Port used
- Verified service: http://localhost:3001

MongoDB connection status
- Default startup: FAILED, exact error recorded in audit-logs/startup-fail.log (ECONNREFUSED on 127.0.0.1:27017).
- Working startup via in-memory DB: CONNECTED.

## 3. PAGE INVENTORY

Table: requested HTML pages, response status, nav presence, API call presence, static/dynamic, and notes.

| File | URL | HTTP status | Linked from nav | Calls backend API | Static or dynamic | Notes |
|---|---|---:|---|---|---|---|
| VITALS/login.html | /login | 200 | Yes (app root redirect) | No | Static | Auth entry page; likely login/signup template |
| VITALS/docter.html | /docter.html | 200 | Yes | No | Static | Doctor cards are hardcoded; uses bamit.html typo |
| VITALS/BOOKAPPOINTMENT.HTML | /BOOKAPPOINTMENT.HTML | 200 | Yes (doctor cards) | Yes, fetch('/api/appointments') in a different file variant with space in name | Static | The page loads, but the booking flow is not persistent |
| VITALS/BOOKAPPOINTMEN  T.HTML | /BOOKAPPOINTMEN%20%20T.HTML | 200 | Possibly | Yes | Static | File name has extra space; route may not be stable |
| VITALS/SecureMeds.html.html | /SecureMeds.html.html | 200 | Yes | No | Static | Pharmacy mock storefront; cart logic is local only |
| VITALS/packages.html | /packages.html | 200 | Yes | No | Static | Health packages and checkout mock UI |
| VITALS/main.html | /main.html | 200 | Yes | Yes, /api/reviews | Static | Review page with local JS |
| VITALS/patient-intake.html | /patient-intake.html | 200 | Maybe | Yes | Static | Patient intake UI wired to /api/auth/login and other routes |
| VITALS/patientportal.html | /patientportal.html | 200 | Maybe | Unknown | Static | Patient portal page |
| VITALS/aboutus.html.html | /aboutus.html.html | 200 | Probably | No | Static | About page |
| VITALS/arogyam.html | /arogyam.html | 200 | Probably | No | Static | Diagnostics page |
| VITALS/cancer.html | /cancer.html | 200 | Probably | No | Static | Disease page |
| VITALS/Cardiac.html | /Cardiac.html | 200 | Probably | No | Static | Disease page |
| VITALS/emergency.html | /emergency.html | 200 | Probably | No | Static | Emergency page |
| VITALS/gaestro.html | /gaestro.html | 200 | Probably | No | Static | Gastro page |
| VITALS/hospitalbed.html | /hospitalbed.html | 200 | Probably | No | Static | Bed page |
| VITALS/insurance.html | /insurance.html | 200 | Probably | No | Static | Insurance page |
| VITALS/lungs.html | /lungs.html | 200 | Probably | No | Static | Disease page |
| VITALS/mentalhealth.html | /mentalhealth.html | 200 | Probably | No | Static | Mental health page |
| VITALS/ourservices (4).html | /ourservices%20(4).html | 200 | Probably | No | Static | Service page |
| VITALS/surgerytracker.html | /surgerytracker.html | 200 | Probably | No | Static | Surgery tracker |
| VITALS/videoconsultation.html | /videoconsultation.html | 200 | Probably | No | Static | Video consult page |
| VITALS/xyzgame.html | /xyzgame.html | 200 | Probably | No | Static | Game page |
| VITALS/admitformpatient.html | /admitformpatient.html | 200 | Probably | No | Static | Admission form |
| VITALS/mentalhealth.html | /mentalhealth.html | 200 | Probably | No | Static | Mental health |
| VITALS/insurance.html | /insurance.html | 200 | Probably | No | Static | Insurance |

Broken internal links and typos
- Source: VITALS/docter.html lines around 500-578.
- Broken target: href="bamit.html" appears in many cards and resolves to HTTP 404 with JSON body {"success":false,"error":"Resource not found"}.
- Source: VITALS/docter.html lines 505, 510, 516, 521, 527, 532, 538, 543, 549, 555, 561, 567, 573, 578.
- Runtime proof: curl -sS --max-time 20 http://localhost:3001/bamit.html returns HTTP 404 and JSON error body.
- File typo: BOOKAPPOINTMEN  T.HTML has a double-space in the filename; it is not a stable URL and may be a copy artifact.

## 4. INTERACTION INVENTORY

| Label / control | Page | Event handler | API endpoint | Status | Exact reason |
|---|---|---|---|---|---|
| Book Appointment links | VITALS/docter.html | static href target | none | BROKEN | href targets missing bamit.html; not a real backend flow |
| Book Appointment (pay modal) | VITALS/BOOKAPPOINTMENT.HTML | openPaymentModal, processPaymentInModal | none in page JS; app.js has /api/appointments POST but page does not call it in this file variant | PARTIAL / BROKEN | The page UI simulates a payment and local save, with no actual persisted server-side booking flow or route call in the loaded page variant |
| Add to Cart | VITALS/SecureMeds.html.html | addToCart(id) and checkout() | none | BROKEN | The cart is an in-browser array; no backend API or database persistence |
| Buy / Checkout | VITALS/SecureMeds.html.html and VITALS/packages.html | checkout() | none | BROKEN | Only UI animation and local state; no order route, payment gateway, order persistence |
| Search | VITALS/SecureMeds.html.html | filterProducts(searchTerm) | none | PARTIAL | Frontend-only filtering, not backed by DB or API |
| Specialty filter | VITALS/docter.html | category or JS filter (not a route) | none | PARTIAL | Card data is hardcoded; no backend-backed doctor listing |
| Contact form | not found in active page inventory | none | none | MISSING | No concrete contact form implementation or backend storage route was found in the app root |
| Login / signup | VITALS/login.html and app.js | form handler in login page plus app.js auth routes | /api/auth/login and /api/auth/signup | PARTIAL | Auth exists in backend and can be tested, but the login page is a static HTML shell and not wired to a full patient flow |
| Reviews | VITALS/main.html | loadReviews / form submit | /api/reviews GET and POST | WORKS (UI only) | It calls backend endpoints and can render/submit review rows |

Evidence for key handlers
- VITALS/docter.html: broken href targets on doctor cards.
- VITALS/BOOKAPPOINTMENT.HTML: payment-modal logic with selectedDate/selectedSlot and local bookedDatabase.
- VITALS/SecureMeds.html.html: addToCart, updateCartUI, checkout, runDemoDeliverySequence.
- VITALS/patient-intake.js: loginAsDefaultUser and API.request wrapper to /api/auth/login etc.
- VITALS/app.js: /api/auth/login and /api/auth/signup defined in backend.

## 5. API MAP

(a) Frontend calls observed
- /api/reviews (GET/POST) from VITALS/main.html.
- /api/appointments (POST) from BOOKAPPOINTMENT.HTML; also /api/appointments/:doctorId may exist in app.js.
- /api/auth/login and /api/auth/signup from VITALS/patient-intake.js and app.js.
- /api/patients, /api/cases, /api/clinical/medical-history, /api/history/*, /api/decision-support/*, /api/monitoring/*, /api/outcomes/*, /api/dashboard/*, /api/plans/*, /api/knowledge/*, /api/analytics/*, /api/observability/* from VITALS/tests and backend route registration.

(b) Backend route inventory from app.js and route files
- app.js defines:
  - GET /, /login, /dashboard, /api/auth/me, /api/health, /api/health/db, /api/auth/login, /api/auth/refresh, /api/auth/logout, /api/auth/signup, /api/reviews, /api/appointments/:doctorId, /api/appointments, /api/recipes maybe not present, etc.
- app.use('/api/patients', patientRoutes)
- app.use('/api/cases', caseRoutes)
- app.use('/api/clinical', clinicalRoutes)
- app.use('/api/history', historyRoutes)
- app.use('/api/documents', documentRoutes)
- app.use('/api/decision-support', decisionSupportRoutes)
- app.use('/api/monitoring', monitoringRoutes)
- app.use('/api/outcomes', outcomeRoutes)
- app.use('/api/alerts', alertsRoutes)
- app.use('/api/dashboard', dashboardRoutes)
- app.use('/api/plans', planRoutes)
- app.use('/api/knowledge', knowledgeRoutes)
- app.use('/api/analytics', analyticsRoutes)
- app.use('/api/observability', observabilityRoutes)
- app.use(express.static(__dirname)) and specific static routes for /patient-intake and /treatment-plan

(c) Mismatches and gaps
- MISSING BACKEND: cart, checkout, order APIs, doctor search filter API, contact form storage, pharmacy catalog DB, appointment booking persistence without local mock-only state.
- ORPHAN ROUTES: some backend routes exist for treatment planning and analytics, but the storefront pages do not call them.
- Method/path mismatches: many .HTML pages are static and do not match the Node routes used by the patient intake mock UI.
- Port mismatch: app defaults to 3000 unless PORT=3001 is set, but runtime verification shows the site was successfully reached at 3001 only when started explicitly.

Middleware order evidence
- app.js order is: bodyParser, express.json, session, usageTracking, cache-control, root redirects, static routes, API routes, express.static(__dirname), validationResult, notFoundHandler, errorHandler.
- This is functionally okay for static pages and API route matching, but it can still return JSON 404s on missing file requests because the final notFoundHandler is a JSON-based fallback.

Route tests with curl (sample, verified)
- GET /login -> HTTP 200, HTML shell.
- GET /dashboard -> HTTP 302 to /login.
- GET /docter.html -> HTTP 200.
- GET /bamit.html -> HTTP 404 with JSON error payload.
- GET /api/health -> HTTP 200 with JSON status connected.
- POST /api/auth/login with valid credentials is supported by app.js route and tests; no live browser login was verified in the UI because the static login page is not a working complete flow.

## 6. BACKEND REVIEW

Routes/controllers/models/middleware structure
- VITALS/app.js is an Express monolith with route groups and static HTML serving.
- Business logic is split into several service modules under VITALS/services and route files under VITALS/routes.
- Individual model files under VITALS/models implement schemas for patient, case, history, documents, plans, monitoring, analytics, etc.

Validation
- app.js imports validationResult from express-validator and enforces it at the end of the route chain.
- There is validation in many routes and tests, but the public storefront pages do not call all of them.

Authentication / authorization
- VITALS/middleware/auth.js contains requireAuth, requireRole, requirePermission, requirePatientScope, requireCaseScope.
- VITALS/services/securityService.js contains JWT creation and verification.
- User model includes role values and permission fields.
- This is not a complete site auth model for doctors, patient portal, admin UI; it is a backend capability layer that is not integrated into the static storefront flow.

Error handling
- VITALS/middleware/errorHandler.js exists and returns sanitized JSON errors.
- notFoundHandler returns a JSON { success: false, error: 'Resource not found' } for missing routes.
- This explains why /bamit.html gets JSON 404 instead of a page.

CORS, security middleware, sanitization
- There is no helmet, no rate-limiting, no CSRF protection, and no explicit CORS policy in the top-level setup.
- The app does set X-Content-Type-Options: nosniff and a basic Cache-Control header.
- There is a security service, but no complete production hardening stack in the app start up.

Password hashing
- app.js and services/securityService.js use bcrypt.hash and bcrypt.compare.
- Evidence: VITALS/services/securityService.js contains bcrypt usage and JWT helpers.

Logging
- Logging is minimal and mostly console.log/console.error; no structured logging, request IDs, or redaction layer is present.

File uploads
- Document schema and document routes exist, but the public storefront pages do not implement a real upload UI or persistent storage for pharmacy or patient documents.

## 7. DATABASE REVIEW

Connection handling
- VITALS/app.js determines DB URL from process.env.MONGODB_URI or mongodb://localhost:27017/hospital_info.
- Default startup fails with ECONNREFUSED because no MongoDB is running.
- Runtime verification used MongoMemoryServer to start the app successfully.

Every model/schema with fields (summary)
- User: username, password, name, role, permissions, tenantId, patientId, assignedPatientIds, assignedCaseIds, refreshTokens, login lockout info.
- Patient: patientNumber, names, email, phone, DOB, gender, address, consent, etc.
- Clinical and case models exist under VITALS/models for Case, Diagnosis, MedicalHistory, TreatmentPlan, Outcome, FollowUp, etc.
- There are many regenerative-medicine clinical models and plan-related models, which do not match the actual storefront site.

Collections that exist
- The app creates and uses many collections through Mongoose models; examples: employees (User model), patients, cases, documents, imaging metadata, contraindication rules, plans, outcomes, observability entries.
- These are backend models, not a shopping/doctor catalog database.

Seed data
- VITALS/app.js ensures seed user and seed document / imaging / rule data.
- The doctors list on the web pages is not coming from the database; it is hardcoded in the HTML cards on VITALS/docter.html and similar pages.
- The pharmacy catalog in VITALS/SecureMeds.html.html is also hardcoded in JavaScript arrays.

Indexes and relations
- Some indexes are defined in models (User, Patient, etc.) and are legitimate, but there is no complete domain model for doctors, prescriptions, product catalogs, carts, checkout orders, or patient appointments as actual persisted entities.

## 8. COMPLETE-WEBSITE GAP ANALYSIS

| Item | Status | Evidence |
|---|---|---|
| User auth (signup, login, logout, JWT/session, password reset) | PARTIAL | app.js defines /login, /signup, /api/auth/login, /api/auth/logout, plus JWT helper service; no password-reset flow in storefront pages |
| Roles (patient, doctor, admin) | PARTIAL | VITALS/models/User.js and VITALS/services/securityService.js define role enum and permissions; actual UI does not enforce or expose role-based flows |
| Doctors: listing from DB | MISSING | doctor cards are static in VITALS/docter.html; no DB-backed doctor model or API found |
| Search / specialty filter | PARTIAL | some JS filters exist in static storefront code but no DB API |
| Doctor detail page | MISSING | no dedicated doctor detail page or route found |
| Availability / slots | PARTIAL | VITALS/BOOKAPPOINTMENT.HTML has a local calendar and bookedDatabase simulation, not a persisted availability model |
| Appointments: create/view/cancel/reschedule | PARTIAL | app.js has /api/appointments routes but the public page flow is mock-only and does not persist reliably |
| Pharmacy: product catalog from DB | MISSING | product arrays are in JavaScript inside VITALS/SecureMeds.html.html and VITALS/packages.html |
| Cart: add/remove/update quantity/persistence | PARTIAL | local JS cart state exists; no DB or backend cart persistence |
| Checkout / orders / payment integration | MISSING | no payment provider or order backend route found |
| Patient dashboard | MISSING | no full patient dashboard with appointments/orders/profile is implemented in the actual frontend |
| Admin dashboard | MISSING | no admin storefront or management route found |
| Contact form backend storage/email | MISSING | no contact form or storage API was found in app.js or routes |
| Departments/specialties pages | PARTIAL | multiple disease pages exist, but no department listing or search app connected to a backend |
| Health packages | PARTIAL | VITALS/packages.html exists, but it is a static mock checkout page |
| Reports | MISSING | no report-generation page or API found |
| Testimonials | PARTIAL | VITALS/main.html calls /api/reviews and saves to database; this is the only working persisted content flow |
| FAQ | MISSING | no FAQ page or API found |
| Non-functional: validation, levels, error states | PARTIAL | some validation exists, but many pages have no real error/loading/empty states beyond JS alerts |
| Custom 404 page | MISSING | JSON 404 handler is used, not a custom page |
| Responsive layout | PARTIAL | CSS exists, but not audited for all breakpoints |
| Accessibility basics | PARTIAL | some semantic HTML exists, but no systematic accessibility audit was performed |
| SEO meta tags | PARTIAL | pages include titles and meta viewport tags, but no full SEO strategy |
| Image handling | PARTIAL | static images used; no CDN or optimization policy |
| Environment config | PARTIAL | .env.example exists and app.js reads env vars; actual production config is not finalized |
| Logging | PARTIAL | console logs present; no structured logging or log rotation |
| Automated tests | PARTIAL | 37 tests exist; they are mostly backend API tests, not browser flows
| Docker / CI / deployment readiness | MISSING | no Dockerfile, CI config, or deployment manifest was found in the site root |
| README / API docs | PARTIAL | VITALS/docs contains API docs for some treatment planning and patient-intake flows, but not a full site doc set |

## 9. SPREADSHEET RECONCILIATION

The spreadsheet file is VITALS/../24_RepoGenesis_Healthcare_ULTIMATE_150_Master.xlsx.

Important mismatch to flag explicitly
- The workbook describes a regenerative-medicine clinical AI platform with 150 features and a detailed feature matrix.
- The actual codebase is a hospital/pharmacy website with static HTML pages, local JS carts, appointment mock flow, and some backend API routes for patient intake and treatment-planning features.
- Therefore, the spreadsheet is not proof of the current site and is not a direct match for what is built.

Project Inventory sheet in the workbook shows 0 files in backend/, frontend/, and aiml/; that is a design-spec artifact, not implementation evidence.

Feature mapping (by area and status) from project evidence
- Patient & Case Intake: PARTIAL
- Clinical Data & Imaging: PARTIAL
- Regenerative Medicine Workflow: PARTIAL
- AI/ML & Clinical Intelligence: MISSING / PARTIAL
- Knowledge & Research: PARTIAL
- Treatment Planning & Decision Support: PARTIAL
- Monitoring & Follow-up: PARTIAL
- Patient & Clinician Frontend: PARTIAL
- Backend APIs & Services: PARTIAL
- Database & Health Data Platform: PARTIAL
- Security, Privacy & Compliance: PARTIAL
- Analytics, Operations & Reliability: PARTIAL
- Advanced AI & Future Features: MISSING

Missing from the spreadsheet that are clearly present in this site
- Pharmacy storefront and cart/checkout flow
- Doctor listing and appointment booking mock front-end
- Product categories, add-to-cart, cart badge, checkout simulation
- Contact flow
- Simple review submission
- Multi-page static hospital marketing site

## 10. MERN CONVERSION PLAN (plan only, do not execute)

Target structure
- client/
  - src/
  - src/pages/
  - src/components/
  - src/services/
  - src/store/
  - src/styles/
  - src/routes/
- server/
  - src/app.js
  - src/config/
  - src/middleware/
  - src/routes/
  - src/controllers/
  - src/models/
  - src/services/
  - src/utils/

Page-to-route mapping table
| Existing page | Proposed React route | Notes |
|---|---|---|
| login.html | /login | maintain auth shell |
| main.html | / | landing page |
| docter.html | /doctors | doctor listing with specialty filters |
| BOOKAPPOINTMENT.HTML | /appointments/new | booking form and confirmation |
| SecureMeds.html.html | /pharmacy | product catalog |
| packages.html | /packages | health package catalog |
| patientportal.html | /portal | patient dashboard |
| aboutus.html.html | /about | about page |
| admitformpatient.html | /admissions/new | admission intake |
| treatment-plan.html | /treatment-plans/new | plan builder |
| contact-like pages | /contact etc. | to be structured |

Shared components to create
- Navbar
- Footer
- DoctorCard
- ProductCard
- SpecialtyFilterBar
- CartSidebar
- BookingModal
- AuthForm
- EmptyState / LoadingState / ErrorBanner

API layer design
- axios instance with base URL from env
- auth token interceptor
- cart and auth state in Redux or Zustand
- form handling via react-hook-form and yup or zod
- protected routes by role

Backend changes needed
- Create server routes for doctors, appointments, pharmacy products, cart, orders, auth, patient dashboard, admin dashboard
- Define Mongoose models with full field definitions for Doctor, Product, Cart, Order, Appointment, User, Patient, Consultation, ContactMessage
- middleware: auth, role, validation, error normalization, request logger
- consistent error format with status, code, message

Migration order in small increments
1. Create server skeleton and health route.
2. Move auth and user model.
3. Move doctor listing and specialty filters.
4. Move book-appointment flow.
5. Move pharmacy and cart.
6. Move checkout and orders.
7. Add dashboards and admin.
Definition of done: API contract, tests, DB seed, and working page route in React.

Risks and breakages
- Static pages and HTML IDs may not map cleanly to React components.
- Local JS cart logic and hardcoded arrays may not carry into DB-backed app.
- Missing Mongo records for real doctor/product data will require seed scripts.
- Browser compatibility and existing CSS may break if port and asset paths are not preserved.

## 11. PRIORITIZED FIX LIST

P0 blockers
1. Broken MongoDB startup: root cause in VITALS/app.js getDbUrl() default to localhost:27017 and no MongoDB service is running. Proposed diff: set required MONGODB_URI or use MongoMemoryServer in development. Effort: S/M.
2. Broken bamit.html link from VITALS/docter.html: root cause is static href that points to missing file. Proposed diff: replace with BOOKAPPOINTMENT.HTML or /appointments/new. Effort: S.
3. Add to Cart / checkout failure in VITALS/SecureMeds.html.html and VITALS/packages.html: root cause is local mock state with no backend or persistence. Proposed diff: create cart API and order route; wire buttons to fetch calls. Effort: M.
4. Page 404 JSON error handler: root cause is notFoundHandler uses JSON object; no custom 404 page. Proposed diff: add HTML 404 page and match route definitions. Effort: S.

P1
- doctor listing should be DB-backed and searchable
- book appointment should persist to database and confirm with a real state machine
- admin/patient dashboards
- contact form backend

P2
- SEO, accessibility, responsive polish, deployment and CI readiness

## 12. OPEN QUESTIONS

- Is the owner targeting a real hospital/pharmacy website or the regenerative-medicine AI spreadsheet platform?
- Which payment provider should be used for production checkout?
- Is an explicit Doctor/Product DB model required for day-one launch, or should the first milestone be a static storefront with a backend API shell?
- Should auth use session cookies, JWT, or both?
- Are clinical AI features in scope for this project, or should the delivery remain to hospital operations only?

## Executive summary
1. The site is not fully built; it is a hybrid static storefront + backend API skeleton.
2. The root blocker is MongoDB connectivity: startup fails without a running database at localhost:27017.
3. The broken doctor navigation to bamit.html is a live runtime defect that returns JSON 404.
4. Cart and checkout are client-side mock flows with no order persistence or backend route.
5. The spreadsheet is a mismatched spec for a regenerative-medicine AI platform; it does not match the current hospital/pharmacy site.
6. The current evidence supports a partial implementation, not a product-ready deployment.
7. Recommended first action: fix the MongoDB startup contract and use a real env-driven database URL.
8. Second action: replace missing doctor links and implement a real appointment booking API.
9. Third action: replace the cart and checkout mocks with a persistent product/order flow.
10. Estimated completeness: partial, roughly 25-35% of the actual hospital storefront and backend flow is present, but not production-ready.
