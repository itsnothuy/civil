# Validation Prompt — Phase 7: Production Infrastructure

> **For:** Claude Opus 4.6 in GitHub Copilot (VS Code Agent Mode)  
> **Purpose:** Validate Phase 7 — security hardening, monitoring, release engineering, community/governance  
> **Pre-requisite:** Phases 1-6 complete (V2 features implemented)  
> **Companion docs:** `completion-plan-2026-03-01.md`, execution prompt, Phase 1-6 validation reports

---

## Instructions

Execute all 7 steps. Output as `docs/reports/validation-report-phase7.md`.  
Same rules: cite evidence, run tests, grade 0-100.

**Phase 7 is unique:** It's infrastructure and process, not features. Many checks are configuration audits rather than code review. Treat each verification as seriously as code review.

---

## Step 0 — Environment Verification

Standard verification suite, plus:

```bash
npm run format:check && npm run lint && npm run typecheck && npm run test && npm run build
npm run test:coverage
npm run test:e2e
npm run test:perf
npm audit --production
npm audit --omit=dev          # also check dev dependencies
git log --oneline -30
docker --version              # if Docker used
```

---

## Step 1 — Structural Audit

### 1a. Files Created/Modified in Phase 7

| Planned File/Config | Task | Expected | Actual | Notes |
|---|---|---|---|---|
| CSP headers config | 7.1 | NEW | ? | In server config or meta tag |
| Rate limiting config | 7.1 | NEW/MODIFIED | ? | Server middleware |
| IFC upload validation | 7.1 | NEW/MODIFIED | ? | File type + size + schema |
| Error boundary component | 7.2 | NEW | ? | Client-side error UI |
| Logging configuration | 7.2 | NEW/MODIFIED | ? | Structured logging setup |
| Health check endpoint | 7.2 | NEW | ? | `/health` or `/api/health` |
| `.github/workflows/release.yml` | 7.3 | NEW/MODIFIED | ? | Release automation |
| `Dockerfile` (production) | 7.3 | NEW/MODIFIED | ? | Production Docker image |
| `CHANGELOG.md` automation | 7.3 | MODIFIED | ? | standard-version or similar |
| `docs/architecture.md` | 7.4 | NEW | ? | Visual architecture diagram |
| `docs/feature-guides/` | 7.4 | NEW | ? | Per-feature guides |
| `.github/ISSUE_TEMPLATE/` | 7.4 | NEW/MODIFIED | ? | Issue templates |
| `.github/PULL_REQUEST_TEMPLATE.md` | 7.4 | NEW/MODIFIED | ? | PR template |
| `GOVERNANCE.md` | 7.4 | NEW | ? | Maintainer decisions |

---

## Step 2 — Task-by-Task AC Verification

### Task 7.1 — Security Hardening (G1)

**Scope (from completion plan):** CSP, HTTPS, metadata sanitization, rate limiting, IFC upload validation, dependency audit automation.

| Criterion | Status | Evidence |
|---|---|---|
| **CSP headers** configured | ? | Check server config / `<meta>` tag |
| CSP blocks inline scripts (except xeokit's `new Function()` if needed) | ? | |
| CSP allows only required origins | ? | |
| **HTTPS enforcement** | ? | Redirect HTTP→HTTPS or HSTS header |
| **Metadata sanitization** — XSS via IFC properties prevented | ? | Check all property display code |
| **Rate limiting** on API endpoints | ? | Check middleware config |
| Rate limit values reasonable (not too permissive) | ? | |
| **IFC upload validation** | ? | |
| File size limit enforced | ? | What is the limit? |
| File type validated (not just extension) | ? | Magic bytes check? |
| **Dependency audit automation** | ? | Dependabot or `npm audit` in CI |
| Dependabot `.github/dependabot.yml` exists | ? | |
| CI fails on critical vulnerabilities | ? | |

**Security scan:**
```bash
npm audit --production            # 0 vulnerabilities expected
npm audit                         # document all, justify any non-zero
```

### Task 7.2 — Error Handling & Monitoring (I-11)

**Scope:** Error boundaries, structured logging, health checks.

| Criterion | Status | Evidence |
|---|---|---|
| **Client-side error boundary** catches unhandled errors | ? | |
| Error boundary shows user-friendly message | ? | |
| Error boundary logs error details | ? | |
| **Structured logging** format (JSON with timestamp, level, source) | ? | |
| Log levels used consistently (error, warn, info, debug) | ? | |
| No `console.log` in production (only structured logger) | ? | |
| Sensitive data not logged (tokens, passwords, PII) | ? | |
| **Sentry integration** (or equivalent) configured | ? | |
| Source maps uploaded to Sentry | ? | |
| **Health check endpoint** `/health` or `/api/health` | ? | |
| Health check returns meaningful status | ? | |
| Health check tests database/service connectivity | ? | |

### Task 7.3 — Release Engineering (I1)

**Scope:** Semantic versioning, CHANGELOG automation, GitHub Release workflow, Docker images, preview deployments.

| Criterion | Status | Evidence |
|---|---|---|
| **Semantic versioning** enforced | ? | Check `package.json` version format |
| **CHANGELOG.md** automated via standard-version or similar | ? | |
| `npm run release` or equivalent script exists | ? | |
| **GitHub Release workflow** | ? | `.github/workflows/release.yml` |
| Release triggers on tag push | ? | |
| Release includes build artifacts | ? | |
| Release notes auto-generated from commits | ? | |
| **Docker images** for server-assisted mode | ? | |
| Docker image tagged with version | ? | |
| Docker image published to registry (GHCR/DockerHub) | ? | |
| **Preview deployments** for PRs | ? | Vercel/Netlify/GitHub Pages preview |
| PR merge requires CI green | ? | Branch protection rules |

### Task 7.4 — Community & Governance (J1)

**Scope:** Architecture docs, feature guides, GitHub Project board, governance.

| Criterion | Status | Evidence |
|---|---|---|
| **Architecture doc** with visual diagrams (Mermaid) | ? | |
| Architecture doc reflects actual system (not aspirational) | ? | |
| All modules documented with responsibilities | ? | |
| **Feature guides** with screenshots | ? | At least 3 guides? |
| Measurement tool guide | ? | |
| Annotation guide | ? | |
| Filter/layer guide | ? | |
| **GitHub Project board** for task tracking | ? | |
| Issues use labels and milestones | ? | |
| **Issue templates** (bug report, feature request) | ? | |
| **PR template** with checklist | ? | |
| `GOVERNANCE.md` — maintainer roles, decision process | ? | |
| `CONTRIBUTING.md` is up-to-date | ? | Check existing file |
| `CODE_OF_CONDUCT.md` is up-to-date | ? | Check existing file |
| **Community outreach** (OSArch, social media) | ? | Documented plan |

---

## Step 3 — Cross-Cutting Concerns

### 3a. Security (COMPREHENSIVE FINAL REVIEW)

This is the **final security audit** before production. Everything must be checked:

| Category | Check | Status | Notes |
|---|---|---|---|
| **XSS** | All user input HTML-escaped | ? | Grep for `innerHTML` without escaping |
| **XSS** | CSP prevents inline script execution | ? | |
| **CSRF** | API endpoints use CSRF tokens or SameSite cookies | ? | |
| **Auth** | OAuth tokens stored securely (httpOnly cookies) | ? | |
| **Auth** | Tokens expire and refresh properly | ? | |
| **Injection** | No SQL injection (parameterized queries) | ? | |
| **Injection** | No command injection (file paths sanitized) | ? | |
| **Upload** | File uploads validated (type, size, content) | ? | |
| **Upload** | Uploaded files stored outside web root | ? | |
| **Deps** | No known vulnerabilities (`npm audit`) | ? | |
| **Deps** | All dependencies actively maintained | ? | |
| **Secrets** | No secrets in source code | ? | |
| **Secrets** | `.env` files in `.gitignore` | ? | |
| **Headers** | Security headers set (X-Frame-Options, X-Content-Type-Options, etc.) | ? | |
| **TLS** | HTTPS enforced | ? | |
| **Rate Limit** | All public endpoints rate-limited | ? | |

### 3b. Reliability

| Check | Status | Notes |
|---|---|---|
| Error boundaries prevent white-screen crashes | ? | |
| WebGL context loss recovery works | ? | |
| Network disconnection handled gracefully | ? | |
| Service Worker doesn't serve stale content after update | ? | |
| Health check endpoint responds under load | ? | |

### 3c. Observability

| Check | Status | Notes |
|---|---|---|
| Errors tracked in monitoring system | ? | |
| Key metrics (load time, FPS, errors) tracked | ? | |
| Alerts configured for critical errors | ? | |
| Log retention policy defined | ? | |

---

## Step 4 — Test Coverage Audit

### Final Coverage

| Metric | Phase 6 | Phase 7 | Target | Met? |
|---|---|---|---|---|
| Statements | ? | ? | ≥80% | ? |
| Branches | ? | ? | ≥70% | ? |
| Functions | ? | ? | ≥70% | ? |
| Lines | ? | ? | ≥80% | ? |

### Infrastructure Tests

| Test Category | Count | Status | Notes |
|---|---|---|---|
| Unit tests | ? | ? | |
| E2E tests | ? | ? | |
| Performance tests | ? | ? | |
| Security tests (CSP, headers) | ? | ? | |
| Health check tests | ? | ? | |
| Rate limiting tests | ? | ? | |

---

## Step 5 — Execution Prompt Accuracy

Final check — the execution prompt should now accurately represent the ENTIRE project:

| Section | Accurate? | Notes |
|---|---|---|
| All phases marked `[x]` complete | ? | |
| FILE MAP reflects all files | ? | |
| Tech stack table current | ? | |
| CURRENT SOURCE CODE section reflects reality | ? | |
| Testing strategy reflects actual setup | ? | |

---

## Step 6 — Dependency & Security

Final production audit:

```bash
npm audit --production
npm outdated
npx license-checker --summary
```

| Check | Status | Notes |
|---|---|---|
| 0 production vulnerabilities | ? | |
| All deps on latest compatible version | ? | |
| License compatibility (AGPL-3.0 project) | ? | |
| No deprecated packages | ? | |

---

## Step 7 — Phase Readiness Assessment

### 7a. Production Readiness Checklist

| Category | Check | Status |
|---|---|---|
| **Code** | All tests pass | ? |
| **Code** | Coverage ≥80% | ? |
| **Code** | 0 ESLint errors | ? |
| **Code** | TypeScript strict mode clean | ? |
| **Security** | 0 known vulnerabilities | ? |
| **Security** | CSP configured | ? |
| **Security** | HTTPS enforced | ? |
| **Security** | Rate limiting active | ? |
| **Monitoring** | Error tracking configured | ? |
| **Monitoring** | Health checks responsive | ? |
| **Release** | v2.0.0 tagged | ? |
| **Release** | CHANGELOG complete | ? |
| **Release** | Docker image published | ? |
| **Docs** | Architecture documented | ? |
| **Docs** | Feature guides written | ? |
| **Docs** | Contributing guide current | ? |
| **Community** | Issue templates configured | ? |
| **Community** | PR template configured | ? |
| **Community** | Governance documented | ? |

### 7b. Outstanding Technical Debt

Consolidate ALL remaining issues from ALL phases:

| # | From Phase | Description | Severity | Plan |
|---|---|---|---|---|
| ? | ? | ? | ? | ? |

### 7c. Project Completion Score

| Phase | Grade | Weight | Weighted Score |
|---|---|---|---|
| Phase 1 | B (83%) | 15% | ? |
| Phase 2 | B (85%) | 15% | ? |
| Phase 3 | ? | 10% | ? |
| Phase 4 | ? | 20% | ? |
| Phase 5 | ? | 20% | ? |
| Phase 6 | ? | 10% | ? |
| Phase 7 | ? | 10% | ? |
| **Total** | | 100% | **?%** |

### 7d. Final Grade

**Grade: ? (?%)**

---

## Final Recommendations

1. **Is the project production-ready?** Yes/No + conditions.
2. **Remaining work for full production deployment.**
3. **Maintenance plan** (who handles updates, how often).
4. **Scaling considerations** for growth.
