# Core Store Hardening Migrations

The repository keeps migration steps in plain Node files under this directory so the app does not require a new migration framework.

## Purpose

- enforce tenant-scoped indexes for the patient, case, document, and imaging stores
- add retention-checking support for operational data cleanup
- keep core metadata model changes explicit and reviewable

## Example run

```bash
node VITALS/migrations/20261022_core_store_hardening.js
```

For production, pair this with a governed MongoDB backup and restore workflow before executing destructive changes.
