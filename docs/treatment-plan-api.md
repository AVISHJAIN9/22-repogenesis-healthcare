# Treatment Plan API

This document describes the Batch 13 treatment-planning API for the RepoGenesis Healthcare backend. The implementation is deterministic and explainable: no ML inference or remote embedding model is used.

## Authentication and authorization

All endpoints require a valid bearer token and authorized role.

- Admin, clinician, and nurse roles can create and review plans.
- Patients can list and read their own plans via the patient scope logic in the auth layer.
- Approval is blocked if a hard contraindication is present.

## Endpoints

### POST /api/plans
Creates a treatment plan for a patient/case.

Request body:

```json
{
  "patientId": "507f1f77bcf86cd799439011",
  "caseId": "507f1f77bcf86cd799439021",
  "target": "Joint regeneration",
  "objective": "Reduce pain and restore mobility",
  "therapy": "PRP + MSC",
  "components": [
    { "name": "Intra-articular injection", "type": "injection", "dose": "2 mL", "schedule": "Week 1" }
  ],
  "timeline": [
    { "phase": "Assessment", "startOffsetDays": 0, "durationDays": 7, "dependencies": [] }
  ],
  "status": "draft",
  "version": 1,
  "notes": "Standard conservative regenerative plan"
}
```

Responses:
- 201 with `success: true` and the created plan
- 400 when required fields are missing or a hard contraindication blocks approval
- 403 when the request crosses tenant boundaries or violates assignment rules

### GET /api/plans
Returns paginated treatment plans.

Query parameters:
- `page` (default `1`)
- `limit` (default `20`)
- `patientId`
- `caseId`
- `status`

### GET /api/plans/:id
Returns the full plan record and its timeline metadata.

### PATCH /api/plans/:id/status
Transitions plan status and enforces contraindication rules before approval.

### POST /api/plans/recommendations
Returns deterministic protocol recommendations for a therapy using stored rule metadata.

### POST /api/plans/compare
Compares two plans or versions and returns a field-level diff.

### POST /api/plans/build
Builds a plan from a selected treatment workflow and component list.

## Contraindication model

`ContraindicationRule` stores rule metadata in MongoDB and is intentionally deterministic. Rules include:
- category: `allergy`, `comorbidity`, `medication`, `lab`, `vital`, or `therapy`
- severity: `info`, `warning`, or `hard`
- conditions: match logic against patient metadata and history
- recommendation: explanatory text for the clinician

Hard-severity findings block plan approval.

## Known gaps

- Frontend is still a static HTML/JS workflow rather than a React component tree, because the repo does not currently contain a React app structure to extend.
- The recommendation engine is rule-based only and intentionally excludes AI/ML recommendation generation.
- PHI/PII is never stored in audit logs; only resource IDs and sanitized metadata are recorded.
