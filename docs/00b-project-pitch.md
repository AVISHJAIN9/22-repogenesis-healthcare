# Project Pitch: Sachidanand Health Care (VITALS)

## 30-Second Elevator Pitch
"I built **Sachidanand Health Care (VITALS)**, a full-stack smart hospital operating system that solves medical administrative fragmentation and financial opacity. Built on Express 5, Node.js, and MongoDB, it features a cinema-style visual bed allocation grid, an automated clinical decision support system that blocks contra-indicated drug combinations, a multi-tenant medical document and DICOM imaging store, Jitsi-powered remote telemedicine, and a gamified digital therapeutics engine for post-stroke rehabilitation."

## 2-Minute Spoken Pitch
"Hospital stays are often filled with anxiety, primarily due to financial surprises, disjointed care teams, and paper-based inefficiency. A patient shouldn't have to wait four hours in an emergency room just to find out if an ICU bed is available, or face a surprise billing statement after surgery.

To fix this, I engineered VITALS as an integrated full-stack hospital ecosystem:

First, on the administrative side, I developed a visual bed allocation grid inspired by airline seating software. Wards can view, reserve, and discharge beds across General, Semi-Private, and ICU wards in real time, while our financial calculator dynamically projects surgical expenses based on insurance deductibles and room selection before admission.

Second, for clinical safety, I built an automated Clinical Decision Support System (CDSS) in `decisionSupportRoutes.js` and `ContraindicationRule.js`. When a physician prescribes a medication or orders a procedure, the engine evaluates the patient's existing allergies and active treatment plans, intercepting adverse drug interactions before orders reach the pharmacy.

Third, for diagnostics, our multi-tenant document store manages laboratory reports and MRI imaging metadata, enforcing checksum validation and virus scanning status before files can be viewed.

Finally, we closed the loop on post-discharge recovery by embedding Jitsi WebRTC video consultations and a gamified stroke rehabilitation module that turns repetitive motor exercises into an engaging digital therapy. 

The backend runs on Express 5 with rigorous multi-tenant RBAC, brute-force lockout defense, and automated testing via Node's native test runner and in-memory MongoDB."
