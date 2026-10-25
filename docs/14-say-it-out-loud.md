# Say It Out Loud: Spoken Interview Scripts

## Project Pitch (60 Seconds)
> "I built Sachidanand Health Care (VITALS), an integrated hospital management system that tackles medical administration bottlenecks and financial opacity. Built on Express 5 and MongoDB, it features a visual cinema-style bed allocation grid for ward heads, an automated clinical decision support system that blocks contra-indicated prescriptions, a multi-tenant document and imaging store, Jitsi telehealth, and gamified digital therapeutics for post-stroke recovery."

## Feature Scripts
### F1: Visual Bed Allocation Grid
> "I developed the visual bed allocation grid to replace chaotic whiteboard tracking in emergency admissions. In `hospitalbed.html` and `dashboardRoutes.js`, triage nurses can view a real-time, cinema-style floor map of all hospital beds across ICU, general, and private wards. Clicking any vacant bed immediately locks it and assigns the patient intake record in MongoDB, preventing accidental double-bookings during critical admissions."

### F2: Clinical Decision Support & Contraindications
> "To safeguard patients against medical errors, I built the Clinical Decision Support engine in `decisionSupportRoutes.js`. When a physician inputs a new prescription or clinical intervention, the system queries `ContraindicationRule.js` against the patient's history. If an interaction with an existing medication or a recorded allergy is detected, the API flags a critical alert with clinical reasoning before the order can be finalized."
