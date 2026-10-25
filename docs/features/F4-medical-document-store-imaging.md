# F4: Multi-Tenant Medical Document & DICOM Store

## Overview
Integrity-verified document management system storing laboratory PDFs, pathology reports, and MRI/CT DICOM metadata.

## Implementation Details
- **Route**: `routes/documentRoutes.js`
- **Models**: `models/Document.js`, `models/ImagingMetadata.js`
- **Integrity**: Checksums, virus scan state tracking, tenant data isolation.

## Say It Out Loud
> "For managing high-resolution scans and lab results, I engineered the document store in `documentRoutes.js`. Every diagnostic file uploaded is recorded with its SHA-256 checksum, MIME type, and virus scan status."
