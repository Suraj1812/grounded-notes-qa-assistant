# Authentication and Security Review

**Date:** 9 June 2026  
**Decision owner:** Priya Shah

## Sign-in

Employees will sign in through Google Workspace SSO. Password-based login will not be supported. Administrator accounts must complete multi-factor authentication at every new device sign-in; other employees follow the Workspace policy.

Sessions expire after eight hours of inactivity. Revoking a user in Google Workspace must end all of their active application sessions within five minutes.

## Data handling

Audit logs are retained for 365 days. Logs may contain user IDs and action metadata, but must never contain note bodies, access tokens, or raw query text. Security will review access to exported audit logs quarterly.

## Open item

Priya will confirm whether contractor accounts can use the same SSO tenant before the pilot begins.
