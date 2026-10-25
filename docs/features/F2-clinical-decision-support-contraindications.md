# F2: Clinical Decision Support & Contraindications

## Overview
Codified clinical intelligence rules that evaluate proposed medications against known patient allergies and concurrent drug regimens.

## Implementation Details
- **Route**: `routes/decisionSupportRoutes.js`
- **Model**: `models/ContraindicationRule.js`
- **Safety Enforcement**: Immediate critical blocking alerts on anaphylactic contraindications.

## Say It Out Loud
> "To safeguard patients against medical errors, I built the Clinical Decision Support engine in `decisionSupportRoutes.js`. When a physician inputs a new prescription, the system queries `ContraindicationRule.js` against the patient's history."
