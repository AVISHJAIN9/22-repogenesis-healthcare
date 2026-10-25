# Confirmation List for Developer

The following architectural decisions were inferred from code patterns and are marked for developer confirmation:

1. `[CONFIRM WITH DEVELOPER]`: Express 5 was selected to eliminate async wrapper boilerplate and leverage native Promise rejection error propagation.
2. `[CONFIRM WITH DEVELOPER]`: Document-based MongoDB schema was preferred over relational SQL due to the heterogeneous nature of patient diagnostic records.
3. `[CONFIRM WITH DEVELOPER]`: Jitsi Meet WebRTC was selected for telehealth to guarantee peer-to-peer call privacy without storing video streams.
