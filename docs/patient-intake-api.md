# Patient Intake API

## Authentication

All patient-intake endpoints require a Bearer token in the Authorization header.

Example:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/patients
```

## Patient endpoints

### POST /api/patients
Creates a patient registration record.

Body:

```json
{
  "firstName": "Aarav",
  "lastName": "Sharma",
  "email": "aarav@example.com",
  "phone": "9123456789",
  "dateOfBirth": "1985-06-12",
  "gender": "Male",
  "address": "MG Road, Pune",
  "emergencyContactName": "Neha Sharma",
  "emergencyContactPhone": "9876543210",
  "consentForTreatment": true
}
```

### GET /api/patients?page=1&limit=20&search=aarav
Lists patients with pagination and search.

### GET /api/patients/:id
Fetches a patient by ID.

### PATCH /api/patients/:id
Updates patient demographics.

### DELETE /api/patients/:id
Soft-deletes a patient.

## Case endpoints

### POST /api/cases
Creates a new case for a patient.

```json
{
  "patientId": "<mongo-object-id>",
  "chiefComplaint": "Chronic joint pain",
  "caseType": "Regenerative Medicine",
  "status": "new"
}
```

### GET /api/cases?page=1&limit=20&status=new
Lists cases by filter and pagination.

### GET /api/cases/:id
Returns a case by ID.

### PATCH /api/cases/:id/status
Updates case status.

## Clinical endpoints

### POST /api/clinical/medical-history
Creates or updates a patient medical history entry.

### GET /api/clinical/medical-history/:patientId?caseId=<id>
Returns medical history for a patient or case.

### POST /api/clinical/diagnoses
Creates a diagnosis record for a case.

### GET /api/clinical/diagnoses/:caseId?patientId=<id>
Returns diagnoses for a case.

### PATCH /api/clinical/diagnoses/:id
Updates diagnosis details.

## Document and imaging endpoints

### GET /api/health and /api/health/db
Returns runtime health and MongoDB connection state.

### GET /api/documents?page=1&limit=20&ownerEntity=patient&ownerId=<mongo-id>
Lists documents with tenant scoping and pagination.

### POST /api/documents
Creates a document metadata record for a patient, case, or clinical entity.

```json
{
  "ownerEntity": "patient",
  "ownerId": "<mongo-object-id>",
  "documentType": "report",
  "originalFileName": "lab-report.pdf",
  "mimeType": "application/pdf",
  "fileSize": 2048,
  "storageKey": "patients/default/report.pdf",
  "checksum": "sha256:...",
  "version": 1,
  "notes": "Lab review"
}
```

### GET /api/documents/:id
Returns one document record.

### GET /api/documents/download/:id
Returns the authorized metadata payload for a document download request. The actual storage retrieval is still handled by the configured storage provider in the app environment.

### PATCH /api/documents/:id
Updates document status or notes.

### DELETE /api/documents/:id
Soft-deletes a document record.

### GET /api/documents/imaging?page=1&limit=20&patientId=<mongo-id>
Lists imaging metadata records for a patient or case.

### POST /api/documents/imaging
Creates rule-based imaging quality metadata for a study.

```json
{
  "patientId": "<mongo-object-id>",
  "caseId": "<mongo-object-id>",
  "modality": "MRI",
  "studyType": "knee-regeneration",
  "storageKey": "patients/default/mri.dcm",
  "width": 2048,
  "height": 1536,
  "fileSizeBytes": 2500000,
  "blurMetric": 80,
  "missingMetadata": ["studyDescription"]
}
```

## Error format

```json
{
  "success": false,
  "error": "Validation failed"
}
```

## Audit logging

All create/update/read actions for patient records are tracked in the `audit_logs` collection without storing raw PHI in logs.

## TODO(AI)

Image quality checks are intentionally rule-based only; ML-based inference, segmentation, and summarization remain out of scope for this batch.
