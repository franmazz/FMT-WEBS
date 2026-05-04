# Security Specification for FMT Webs

## Data Invariants
1. `config/site` is the source of truth for sitewide content. Only authenticated admins can modify it.
2. `consultas` and `pedidos` can be created by anyone but only read/managed by admins.
3. `portfolio` items must have an `order` field for display consistency.

## The Dirty Dozen Payloads (Attack Vectors)
1. Unauthorized overwrite of `config/site` without auth.
2. Injection of malicious scripts in `portfolio` description.
3. Rapid creation of `consultas` (spam) - *Mitigated by Firestore quota and client-side checks*.
4. Deletion of `services` by non-admins.
5. Modification of `pedidos` amount after creation.
6. Reading of `consultas` (private user data) by other users.
7. Attempting to set `request.auth` uid to a spoofed admin ID.
8. Modifying `plan.price` by non-admins.
9. Uploading huge payloads to `config/site`.
10. Attempting to write to collections not defined in the system.
11. Reading the admin password from client-side if rules are weak.
12. Deleting the entire database (match-all rule check).

## Penetration Test Results (Expected)
- [PASS] Unauthorized write to `config/site` -> REJECTED
- [PASS] Unauthorized read of `consultas` -> REJECTED
- [PASS] Anonymous user creating a `consulta` -> ALLOWED
- [PASS] Authenticated admin updating `portfolio` -> ALLOWED
