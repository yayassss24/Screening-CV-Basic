# Security Specification for JagoCV AI

## 1. Data Invariants
- **User Profile Protection**: Users can only read and write their own profile where the document key matches their user UID, or lookup by email matches their authenticated token.
- **Voucher/Activation Code Scarcity**: Activation codes can only be viewed and updated. No public creation or deletion allowed. Redemptions require verifying that `digunakan` changes from `false` to `true` (and never back), recording the authenticated user email, and locking other keys.
- **Report Ownership Integrity**: Users can read and write only their own analysis reports. The field `email` must match the authenticated user's email. Reports cannot be edited post-creation because they represent raw historical records.
- **Server Safety**: Default-deny any unmapped path or collection.

## 2. The "Dirty Dozen" Malicious Payloads
1. **Unauthenticated Read on Profiles**: Trying to fetch `users/any_uid` without logging in. (Should fail)
2. **Profile Theft (Unauthorized Read)**: Authenticated user `A` tries to read `users/user_B`. (Should fail)
3. **Privilege Escalation (Self-Upgrade)**: Authenticated Trial user attempts to write `paket: "PRO"` directly to their own profile without redeeming a valid code. (Should fail via validation hasOnly checks or custom API-driven rules)
4. **Voucher Forgery (Add Free Code)**: A user tries to create an active code directly in `/activation_codes/my-fake-code`. (Should fail)
5. **Voucher Double Redemption**: Redeeming an activation code where `existing().digunakan == true`. (Should fail)
6. **Voucher Revocation Attack**: Overwriting an activation code to reset `digunakan = false` to reuse the voucher. (Should fail)
7. **Report Poisoning (Other User's Report)**: User `A` tries to read `saved_analyses/analysis_from_B`. (Should fail)
8. **Malicious Report Creation**: User `A` creates a report with `email: "B@gmail.com"`. (Should fail)
9. **Report Retrospective Alteration**: Mutating an existing report's general content. (Should fail)
10. **Resource Exhaustion/ID Poisoning**: Injecting 1MB of symbols in report ID path variables. (Should fail)
11. **Spoofed Admin Privilege**: Injecting custom token claims to bypass rules. (Should fail)
12. **PII Collection Harvesting**: Reading `/users/` list query without proper filters or ownership matches. (Should fail)
