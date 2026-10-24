# Security Policy

## Supported versions

Security fixes are applied to the latest commit on the default branch (`main` / `master`). Older releases and forks are not routinely patched.

| Version / branch | Supported |
| ---------------- | --------- |
| Latest default branch | Yes |
| Older commits / tags | No |

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report privately instead:

1. Prefer [GitHub private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) on this repository (Security → Report a vulnerability), if enabled.
2. Or open a [draft GitHub Security Advisory](https://docs.github.com/en/code-security/security-advisories/working-with-repository-security-advisories/creating-a-repository-security-advisory) and invite maintainers.
3. If neither option is available, contact the repository maintainers via a **private** channel linked from the GitHub profile of the org/owner — do not include exploit details in public comments or PRs.

### What to include

- Description of the issue and potential impact
- Steps to reproduce (PoC if available)
- Affected component (web app, Cloudflare Worker, Supabase/RLS, Flutter mobile, CI, dependencies)
- Suggested fix, if you have one

### What to expect

- Acknowledgement within **7 days** (best effort)
- Status update when we triage severity and plan a fix
- Credit in the advisory or release notes if you want it (say so in the report)

We ask that you give us a reasonable window to fix and publish before any public disclosure.

## Scope

In scope examples:

- Authentication / session handling (email, Google, Apple / Supabase Auth)
- Authorization and data exposure (including Supabase RLS and shared demo/prod data boundaries)
- Injection, XSS, CSRF, and similar web issues in this app
- Secrets or credentials leaked in the repository or client builds
- Abuse of AI Worker or other backend endpoints that affects confidentiality or integrity of user data

Out of scope examples:

- Issues that require physical access to an unlocked device
- Social engineering of users or maintainers
- Denial of service without a clear, practical security impact
- Vulnerabilities only in third-party services we do not control (report those upstream), unless our integration misconfigures them
- Missing best-practice hardening with no demonstrated impact

## Safe harbor

If you follow this policy in good faith, we will not pursue legal action related to your research. Do not access or modify data that is not yours, do not degrade service availability, and stop testing if you encounter personal or sensitive data that is not yours — report it instead.

## Non-security bugs

Use [GitHub Issues](https://github.com/onaoki0503-lgtm/team-note/issues) for ordinary bugs and feature requests.
