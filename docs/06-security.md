# Security Audit & HIPAA Compliance

## Security Architecture
1. **Password Hashing**: `bcrypt` with salt rounds 10.
2. **Brute Force Lockout**: Failed attempts tracked in `securityService.js`; accounts locked for 15 minutes after 5 consecutive failures.
3. **Role-Based Access Control (RBAC)**: Granular permissions (`patient:read`, `patient:write`, `clinical:read`, `clinical:write`, `audit:read`).
4. **Data Integrity**: SHA-256 checksums on all uploaded diagnostic files.
5. **Virus Scanning State**: Documents flag `virusScanStatus: 'clean'` before being served.
