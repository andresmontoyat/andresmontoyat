---
quick_id: 261114-hio
status: complete
branch: fix/site-audit-2
---
# Site audit follow-ups: summary

Commits: b177475 csp hashes, 9a77412 privacy, 04337e1 ui, 2830c80 theme.

- CSP: added prod analytics hash 86z0...; removed 2 stale hashes (hIBd3 local-only analytics, GBck gone). csp-hashes.mjs gained --live and --check. Enforcing CSP: 0 violations on /en/ and /es/ (local analytics hash injected for the test, since Vercel injects its analytics config at deploy).
- Privacy: phone removed from contact.json, Person JSON-LD, CV generator; Profile.pdf deleted. Existing CV PDFs in public/ were not regenerated.
- UI: intros/taglines to Inter; 10 visible experience entries show 6 chips + "+N".
- Theme: follows prefers-color-scheme with no stored choice; stored wins; only the toggle writes storage.
- Tests: 732 passing. Lighthouse mobile perf 0.96-0.97, a11y 1, SEO 1, BP 0.96 (known analytics 404).
