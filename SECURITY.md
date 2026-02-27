# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.x (pre-release) | ✅ Active development |

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Report security issues privately by emailing: **security@[your-domain]** (replace with actual contact).

Include:
- A description of the vulnerability and its potential impact
- Steps to reproduce (proof-of-concept if possible)
- Affected versions

We will acknowledge your report within 48 hours and aim to release a patch within 14 days for critical issues.

## Security Considerations

- **IFC file handling:** All IFC files should be treated as untrusted input. The conversion pipeline (ifcconvert) runs as a separate process; do not parse IFC in-process on the server.
- **Annotation content:** Sanitize all annotation text before rendering to prevent XSS.
- **Dependencies:** We use `npm audit` in CI and GitHub Dependabot for automated vulnerability scanning.
- **Content Security Policy:** A strict CSP is set on all served pages.
