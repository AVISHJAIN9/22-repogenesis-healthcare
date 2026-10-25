# API Reference: VITALS Healthcare Platform

## 1. Authentication Endpoints
- `POST /api/auth/login`: Authenticates clinical users; returns JWT access token and sets httpOnly session cookie.
- `POST /api/auth/refresh`: Rotates refresh token and issues fresh access token.

## 2. Patient Intake & EMR
- `GET /api/patients`: Lists tenant patients with pagination and search.
- `POST /api/patients`: Registers new patient intake record with demographic metadata.
- `GET /api/patients/:id/history`: Retrieves longitudinal medical encounters and allergy lists.

## 3. Clinical Decision Support (CDSS)
- `POST /api/decision-support/evaluate`: Evaluates candidate prescription against patient allergies.
- **Payload**:
```json
{
  "patientId": "651a2b3c4d5e6f7a8b9c0d1e",
  "proposedMedication": "Amoxicillin 500mg",
  "diagnoses": ["Bacterial Sinusitis"]
}
```
- **Response**:
```json
{
  "status": "warning",
  "contraindications": [
    {
      "severity": "CRITICAL",
      "rule": "PENICILLIN_CLASS_ALLERGY",
      "message": "Patient has confirmed anaphylaxis history with Penicillin-derived antibiotics."
    }
  ]
}
```

## 4. Ward Bed Management
- `GET /api/dashboard/occupancy`: Returns current bed counts by ward and status.
- `POST /api/dashboard/beds/allocate`: Atomically updates bed occupancy state.
