# Q2 Planning Meeting

**Date:** 6 June 2026  
**Attendees:** Maya, Theo, Priya, Jordan

## Caching decision

The team agreed to use Redis for the dashboard summary cache. Entries will have a 15-minute TTL, and writes to an account will invalidate that account's cached summary immediately. We chose this over an in-process cache because the API runs across multiple instances.

Maya owns the first implementation and will open a pull request by 14 June. We will review cache hit rate and stale-read incidents two weeks after release.

## Reporting scope

The first Q2 reporting release will include revenue, active accounts, and conversion rate. Custom report builders are explicitly out of scope until the standard metrics have been validated with customers.

## Follow-ups

- Theo will add cache metrics to the existing Grafana dashboard.
- Priya will document the invalidation events.
- The team will revisit the TTL after collecting production traffic data.
