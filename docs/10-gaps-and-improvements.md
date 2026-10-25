# Gaps & Technical Roadmap

## Known Gaps
1. **PACS Server Integration**: Medical imaging metadata is tracked in MongoDB, but raw multi-gigabyte DICOM binary files are currently referenced via local storage keys rather than an enterprise Orthanc PACS server.
2. **FHIR HL7 API Compliance**: API endpoints follow REST JSON conventions rather than official Fast Healthcare Interoperability Resources (FHIR R4) XML/JSON schemas.

## High-Priority Improvements
- Add HL7/FHIR R4 adapter middleware for interoperability with government health registries (ABDM in India).
- Deploy Orthanc PACS bridge for browser-based DICOM image slicing and rendering.
