# Validation Report — Phase 7: Production Infrastructure

> **Date:** 2026-03-24  
> **Validator:** Claude Opus 4.6 (GitHub Copilot Agent Mode)  
> **Pre-requisite:** Phases 1–6 complete (V2 features implemented)  
> **Companion docs:** `completion-plan-2026-03-01.md`, Phase 1–6 validation reports

---

## Step 0 — Environment Verification

| Check | Result | Notes |
|-------|--------|-------|
| `npm run format:check` | ✅ PASS | All matched files use Prettier code style |
| `npm run lint` | ⚠️ WARN | 0 errors, 4 warnings (3 `import/order` + 1 spacing) |
| `npm run typecheck` | ✅ PASS | `tsc --noEmit` clean |
| `npm run test` | ✅ PASS | **29 suites, 825 tests, 0 failures** |
| `npm run build` | ✅ PASS | 3.45 kB HTML + 13.59 kB CSS + 1,307 kB JS |
| `npm run test:coverage` | ⚠️ WARN | 87.06% stmts (threshold 90%), 70.08% branches (threshold 70%) |
| `npm audit --production` | ✅ PASS | **0 vulnerabilities** |
| `npm audit` (all deps) | ⚠️ WARN | 5 vulns (4 low, 1 high) — all in dev deps (`jest-environment-jsdom` → `jsdom` → `@tootallnate/once`, `flatted`) |
| `git log --oneline -5` | ✅ | 4 Phase 7 commits with conventional messages |
| `git tag -l` | ✅ | `v0.1.0`, `v1.0.0` present (no `v2.0.0` yet) |

**Phase 7 commits (4 total):**
```
239402d docs(community): add architecture docs, feature guides, governance, and templates (Task 7.4)
4506c9c feat(release): add release engineering infrastructure (Phase 7, Task 7.3)
f5faeee feat(monitoring): add structured Logger, ErrorBoundary, and monitoring infrastructure
a9ead20 feat(security): add CSP headers, HTTPS enforcement, security middleware, and hardened upload validation
```

---

## Step 1 — Structural Audit

### 1a. Files Created/Modified in Phase 7

| Planned File/Config | Task | Expected | Actual | Notes |
|---|---|---|---|---|
| CSP headers config | 7.1 | NEW | ✅ `src/security/SecurityHeaders.ts` (148 lines) | Client-side CSP + meta tag injection |
| Rate limiting config | 7.1 | NEW | ✅ `server/middleware/SecurityMiddleware.ts` (176 lines) | 3-tier rate limits |
| IFC upload validation | 7.1 | MODIFIED | ✅ `server/pipeline/UploadEndpoint.ts` (Phase 6) | Magic bytes + extension + MIME + size |
| Error boundary component | 7.2 | NEW | ✅ `src/monitoring/ErrorBoundary.ts` (245 lines) | Global error/rejection handlers + overlay UI |
| Logging configuration | 7.2 | NEW | ✅ `src/monitoring/Logger.ts` (259 lines) | Structured JSON, redaction, transports |
| Health check endpoint | 7.2 | NEW | ✅ `server/index.ts` L333-352 | `/api/health` with uptime, memory, store stats |
| `.github/workflows/release.yml` | 7.3 | NEW | ✅ 134 lines | 4-job pipeline (validate → CI → release → Docker) |
| `Dockerfile` (production) | 7.3 | MODIFIED | ✅ Root `Dockerfile` (47 lines) | Multi-stage, nginx, HEALTHCHECK |
| CHANGELOG automation | 7.3 | MODIFIED | ✅ `scripts/release.mjs` (204 lines) | Conventional commits → Keep a Changelog |
| `docs/architecture.md` | 7.4 | NEW | ✅ ~280 lines | 4 Mermaid diagrams, module map, design decisions |
| `docs/feature-guides/` | 7.4 | NEW | ✅ 3 guides (annotations, filters, measurement) | 100–170 lines each |
| `.github/ISSUE_TEMPLATE/` | 7.4 | NEW | ✅ `bug_report.md` + `feature_request.md` | YAML front matter + structured sections |
| `.github/PULL_REQUEST_TEMPLATE/` | 7.4 | NEW | ✅ `pull_request_template.md` | Checklist + change type + screenshots |
| `GOVERNANCE.md` | 7.4 | NEW | ✅ 127 lines | Roles, decisions, conflict resolution, outreach |
| Additional: `.github/workflows/preview.yml` | 7.3 | BONUS | ✅ PR preview deployments | Upload artifacts + PR comment |
| Additional: `docker/nginx.conf` | 7.1 | BONUS | ✅ 56 lines | Security headers, gzip, caching, /healthz |
| Additional: `.github/dependabot.yml` | 7.1 | EXISTING | ✅ | npm weekly + github-actions weekly |
| Additional: tests | 7.1-7.2 | NEW | ✅ 4 test suites | SecurityHeaders, SecurityMiddleware, ErrorBoundary, Logger |

**Structural completeness: 14/14 planned items delivered + 4 bonus items.**

---

## Step 2 — Task-by-Task AC Verification

### Task 7.1 — Security Hardening (G1)

| Criterion | Status | Evidence |
|---|---|---|
| **CSP headers** configured | ✅ PASS | Client: `SecurityHeaders.ts` L26-60. Server: `SecurityMiddleware.ts` L49-68 |
| CSP blocks inline scripts | ✅ PASS | `script-src 'self' 'unsafe-eval'` — no `'unsafe-inline'` |
| CSP allows only required origins | ✅ PASS | `blob:` for workers/textures, `data:` for nav-cube, `connect-src` limited to self + GitHub API |
| `unsafe-eval` documented for xeokit | ✅ PASS | JSDoc: "xeokit-sdk uses `new Function()` internally" |
| **HTTPS enforcement** | ✅ PASS | Client: `enforceHTTPS()` skips localhost. Server: `httpsRedirect()` checks `x-forwarded-proto` |
| **Metadata sanitization** — XSS prevention | ✅ PASS | `escapeHtml()` applied in PropertiesPanel, ModelLoader, ErrorBoundary, UtilitiesPanel, StoreyNavigator. 2 low-risk internal-data innerHTML uses (FilterPanel discipline names, UIController plane IDs) |
| **Rate limiting** on API endpoints | ✅ PASS | 100/15min general, 20/15min auth, 10/15min upload |
| Rate limit values reasonable | ✅ PASS | Tiered by endpoint sensitivity |
| **IFC upload validation** | ✅ PASS | 200 MB limit, `.ifc` extension, MIME check, **magic bytes** (`ISO-10303-21`) |
| **Dependency audit automation** | ✅ PASS | `.github/dependabot.yml` exists (npm weekly, 5 PR limit) |
| CI fails on critical vulnerabilities | ⚠️ PARTIAL | `npm audit` in CI workflow exists, but threshold is not enforced (no `--audit-level=critical` flag) |

**Security scan results:**
- Production: **0 vulnerabilities**
- Dev dependencies: 5 (4 low via `@tootallnate/once` in jsdom chain, 1 high via `flatted`) — all fixable with `npm audit fix`

**Task 7.1 Score: 93/100**

---

### Task 7.2 — Error Handling & Monitoring

| Criterion | Status | Evidence |
|---|---|---|
| **Client-side error boundary** catches unhandled errors | ✅ PASS | `window.onerror` + `window.onunhandledrejection` in ErrorBoundary.ts |
| Error boundary shows user-friendly message | ✅ PASS | Styled toast overlay with `role="alert"`, `aria-live="assertive"`, dismiss button |
| Error boundary logs error details | ✅ PASS | Logs to structured Logger with full stack trace |
| **Structured logging** format (JSON) | ✅ PASS | `LogEntry`: timestamp, level, source, message, data, error |
| Log levels used consistently | ✅ PASS | error/warn/info/debug throughout codebase |
| No `console.log` in production | ✅ PASS | Zero `console.log` in `src/` — uses `console.info`/`console.warn` or Logger |
| Sensitive data not logged | ✅ PASS | Redacts Bearer tokens, token/password/secret fields, long base64 strings |
| **Sentry integration** configured | ⚠️ PARTIAL | Architecture supports it (`onError` callback + `LogTransport` interface). No Sentry SDK installed. |
| Source maps uploaded to Sentry | ❌ N/A | No Sentry configured |
| **Health check** `/api/health` | ✅ PASS | Returns status, timestamp, version, uptime, memory (heap), store sizes |
| Health check returns meaningful status | ✅ PASS | Includes heap used/total MB, project/session/viewpoint counts |
| Health check tests DB/service connectivity | ⚠️ PARTIAL | Tests in-memory store sizes; no external DB, so adequate for current arch |

**Task 7.2 Score: 88/100**

---

### Task 7.3 — Release Engineering (I1)

| Criterion | Status | Evidence |
|---|---|---|
| **Semantic versioning** enforced | ✅ PASS | `release.mjs` validates `^(\d+)\.(\d+)\.(\d+)` |
| **CHANGELOG.md** automated | ✅ PASS | `buildChangelogEntry()` parses conventional commits into Keep a Changelog sections |
| `npm run release` script exists | ✅ PASS | `package.json`: `"release"`, `"release:dry"` |
| **GitHub Release workflow** | ✅ PASS | `.github/workflows/release.yml` — 4-job pipeline |
| Release triggers on tag push | ✅ PASS | `on: push: tags: ["v*"]` |
| Release includes build artifacts | ✅ PASS | `.tar.gz` + `.zip` uploaded to Release |
| Release notes auto-generated | ✅ PASS | `softprops/action-gh-release@v2` with `generate_release_notes: true` |
| **Docker images** for server-assisted mode | ✅ PASS | Root `Dockerfile` (multi-stage, nginx) + `release.yml` ghcr.io push |
| Docker image tagged with version | ✅ PASS | `type=semver,pattern={{version}}` + major + major.minor + sha |
| Docker image published to registry | ✅ PASS | ghcr.io via `docker/build-push-action@v5` |
| **Preview deployments** for PRs | ✅ PASS | `.github/workflows/preview.yml` — artifact upload + PR comment |
| PR merge requires CI green | ⚠️ UNVERIFIABLE | Branch protection rules are a GitHub setting, not in code |
| v2.0.0 tag created | ❌ NOT YET | `package.json` still says `1.0.0` |

**Task 7.3 Score: 92/100**

---

### Task 7.4 — Community & Governance (J1)

| Criterion | Status | Evidence |
|---|---|---|
| **Architecture doc** with visual diagrams | ✅ PASS | `docs/architecture.md` — 4 Mermaid diagrams (system overview, model loading, annotation workflow, security flow) |
| Architecture doc reflects actual system | ✅ PASS | Module map matches actual `src/` structure with 25+ modules |
| All modules documented | ✅ PASS | Client (14 modules) + server (4 modules) + infrastructure documented |
| **Feature guides** with screenshots | ⚠️ PARTIAL | 3 guides exist (annotations, filters, measurement). No actual screenshots (text descriptions only). |
| Measurement tool guide | ✅ PASS | `docs/feature-guides/measurement-tool.md` (~100 lines) |
| Annotation guide | ✅ PASS | `docs/feature-guides/annotations.md` (~170 lines) |
| Filter/layer guide | ✅ PASS | `docs/feature-guides/filter-layers.md` (~130 lines) |
| **Issue templates** (bug, feature) | ✅ PASS | `.github/ISSUE_TEMPLATE/bug_report.md` + `feature_request.md` |
| **PR template** with checklist | ✅ PASS | `.github/PULL_REQUEST_TEMPLATE/pull_request_template.md` |
| `GOVERNANCE.md` | ✅ PASS | 127 lines — maintainer/contributor/community roles, decision process, conflict resolution |
| `CONTRIBUTING.md` up-to-date | ✅ PASS | Correct prerequisites (Node ≥20), references architecture docs, CLA section |
| `CODE_OF_CONDUCT.md` up-to-date | ⚠️ MINOR | Contributor Covenant v2.1 — no specific enforcement contact listed |
| **Community outreach** documented | ✅ PASS | GOVERNANCE.md includes outreach plan (OSArch, Hacker News, social media) |

**Additional community files verified:**
- `SECURITY.md` — ⚠️ placeholder email `security@[your-domain]`
- `CLA.md` — ✅ Complete individual CLA modeled after Apache ICLA v2.0

**Task 7.4 Score: 90/100**

---

## Step 3 — Cross-Cutting Concerns

### 3a. Security (COMPREHENSIVE FINAL REVIEW)

| Category | Check | Status | Notes |
|---|---|---|---|
| **XSS** | All user input HTML-escaped | ✅ PASS | `escapeHtml()` on all IFC metadata, annotations, error messages. 2 low-risk internal innerHTML uses |
| **XSS** | CSP prevents inline script execution | ✅ PASS | `script-src 'self' 'unsafe-eval'` — no `unsafe-inline` |
| **CSRF** | API endpoints protected | ⚠️ N/A | Server uses token-based auth (bearer), not cookies. CORS configured. |
| **Auth** | OAuth tokens stored securely | ⚠️ PARTIAL | Tokens stored in-memory Map on server; not httpOnly cookies. Acceptable for current scope. |
| **Auth** | Tokens expire and refresh properly | ⚠️ PARTIAL | Sessions stored in-memory, no explicit expiry. Server restart clears all sessions. |
| **Injection** | No SQL injection | ✅ N/A | No SQL database — uses in-memory Maps |
| **Injection** | No command injection | ✅ PASS | File paths sanitized via `sanitizeFilePath()` — null bytes, `..`, leading slashes removed |
| **Upload** | File uploads validated | ✅ PASS | Extension + MIME + magic bytes + 200 MB size limit |
| **Upload** | Uploaded files outside web root | ⚠️ PARTIAL | `ConversionQueue.ts` stores to configurable output dir; no explicit web root isolation |
| **Deps** | No known production vulns | ✅ PASS | `npm audit --production`: 0 vulnerabilities |
| **Deps** | All dependencies maintained | ✅ PASS | Dependabot weekly checks configured |
| **Secrets** | No secrets in source | ✅ PASS | `JWT_SECRET` defaults to dev placeholder, reads from `process.env` |
| **Secrets** | `.env` files in `.gitignore` | ✅ PASS | `.env`, `.env.local`, `.env.*.local` all excluded |
| **Headers** | Security headers set | ✅ PASS | X-Frame-Options, X-Content-Type-Options, COOP, CORP, HSTS, Permissions-Policy |
| **TLS** | HTTPS enforced | ✅ PASS | Client-side redirect + server-side redirect (production only) |
| **Rate Limit** | All public endpoints rate-limited | ✅ PASS | 3-tier: general (100), auth (20), upload (10) per 15 min window |

### 3b. Reliability

| Check | Status | Notes |
|---|---|---|
| Error boundaries prevent white-screen crashes | ✅ PASS | Global `onerror` + `unhandledrejection` → non-blocking toast overlay |
| WebGL context loss recovery | ✅ PASS | Handled in ViewerCore via canvas element listener |
| Network disconnection handled | ✅ PASS | RealtimeSync has auto-reconnect; OfflineStorage queues changes |
| Service Worker stale content | ⚠️ PARTIAL | ServiceWorkerManager exists but no actual `sw.js` file (Phase 6 gap) |
| Health check responds under load | ✅ PASS | Lightweight endpoint — returns in-memory data only |

### 3c. Observability

| Check | Status | Notes |
|---|---|---|
| Errors tracked in monitoring system | ✅ PASS | Logger + ErrorBoundary with `onError` callback (Sentry-ready) |
| Key metrics tracked | ✅ PASS | PerformanceOptimizer tracks load time, FPS, heap |
| Alerts configured for critical errors | ⚠️ NOT YET | Transport interface exists; no alert transport configured |
| Log retention policy | ⚠️ PARTIAL | Ring buffer (500 entries) in-browser; no server-side retention policy |

---

## Step 4 — Test Coverage Audit

### Final Coverage

| Metric | Phase 6 | Phase 7 | Target | Met? |
|---|---|---|---|---|
| Statements | 87.09% | **87.06%** | ≥80% ✅ (≥90% ⚠️) | ✅ 80% target, ⚠️ 90% jest threshold |
| Branches | 69.21% | **70.08%** | ≥70% | ✅ Yes |
| Functions | — | **90.18%** | ≥70% | ✅ Yes |
| Lines | — | **89.03%** | ≥80% ✅ (≥90% ⚠️) | ✅ 80% target, ⚠️ 90% jest threshold |

**Coverage change Phase 6 → Phase 7:** Statements stable (~87%), branches improved slightly (69.21% → 70.08%). The jest.config.js threshold of 90% for statements and lines is NOT met — this was a pre-existing issue from Phase 6.

### Infrastructure Tests (Phase 7 additions)

| Test File | Tests | Status | Coverage Target |
|---|---|---|---|
| `tests/unit/SecurityHeaders.test.ts` | ~30 | ✅ PASS | CSP, meta tag, HTTPS, escaping, URL sanitization |
| `tests/unit/SecurityMiddleware.test.ts` | ~25 | ✅ PASS | Headers, CSP builder, redirect, path sanitization, rate limits |
| `tests/unit/ErrorBoundary.test.ts` | ~20 | ✅ PASS | Install, wrap, overlay, XSS, dismiss, callbacks |
| `tests/unit/Logger.test.ts` | ~25 | ✅ PASS | Singleton, levels, JSON format, redaction, transports |

### Test counts progression:
| Phase | Unit Tests | E2E Tests | Perf Tests | Total |
|---|---|---|---|---|
| Phase 4 | 210 | 57 | 2 | 269 |
| Phase 5 | 389 | 57 | 2 | 448 |
| Phase 6 | 626 | 57 | 2 | 685 |
| **Phase 7** | **825** | **57** | **2** | **884** |

**Phase 7 added 199 unit tests** (626 → 825).

### Missing Tests

| Missing Test | Severity | Notes |
|---|---|---|
| `scripts/release.mjs` unit tests | MEDIUM | Exported functions are testable |
| `server/index.ts` integration tests | MEDIUM | Express routes + health check untested |
| E2E tests for Phase 5-7 features | MEDIUM | Only Phase 1-4 E2E tests exist |

---

## Step 5 — Execution Prompt Accuracy

| Section | Accurate? | Notes |
|---|---|---|
| All phases marked `[x]` complete | ⚠️ NO | Phase 7 not yet marked in execution prompt |
| FILE MAP reflects all files | ⚠️ PARTIAL | Phase 7 files (SecurityHeaders, ErrorBoundary, Logger, SecurityMiddleware) not in map |
| Tech stack table current | ✅ YES | xeokit, Vite, Playwright, Jest listed correctly |
| CURRENT SOURCE CODE section | ⚠️ NEEDS UPDATE | Phase 7 modules not listed |
| Testing strategy reflects actual setup | ⚠️ NEEDS UPDATE | 825 unit tests not reflected |

---

## Step 6 — Dependency & Security

| Check | Status | Notes |
|---|---|---|
| 0 production vulnerabilities | ✅ PASS | `npm audit --production`: 0 vulnerabilities |
| All deps on latest compatible version | ⚠️ PARTIAL | 5 dev-dep vulnerabilities fixable with `npm audit fix` |
| License compatibility (AGPL-3.0 project) | ✅ PASS | xeokit-sdk is AGPL-3.0 (aligned), all other deps MIT/ISC/BSD compatible |
| No deprecated packages | ✅ PASS | No deprecation warnings during install |

---

## Step 7 — Phase Readiness Assessment

### 7a. Production Readiness Checklist

| Category | Check | Status |
|---|---|---|
| **Code** | All tests pass | ✅ 825/825 |
| **Code** | Coverage ≥80% stmts | ✅ 87.06% |
| **Code** | Coverage ≥90% stmts (jest threshold) | ⚠️ 87.06% < 90% |
| **Code** | 0 ESLint errors | ✅ 0 errors (4 warnings) |
| **Code** | TypeScript strict mode clean | ✅ `tsc --noEmit` passes |
| **Security** | 0 known prod vulnerabilities | ✅ PASS |
| **Security** | CSP configured | ✅ Client + server |
| **Security** | HTTPS enforced | ✅ Client + server |
| **Security** | Rate limiting active | ✅ 3-tier |
| **Monitoring** | Error tracking configured | ✅ ErrorBoundary + Logger |
| **Monitoring** | Health checks responsive | ✅ `/api/health` |
| **Release** | v2.0.0 tagged | ❌ Not yet (package.json: 1.0.0) |
| **Release** | CHANGELOG complete | ⚠️ No 2.0.0 entry yet |
| **Release** | Docker image published | ⚠️ Workflow ready, not executed |
| **Docs** | Architecture documented | ✅ 4 Mermaid diagrams |
| **Docs** | Feature guides written | ✅ 3 guides |
| **Docs** | Contributing guide current | ✅ Updated |
| **Community** | Issue templates configured | ✅ Bug + Feature |
| **Community** | PR template configured | ✅ With checklist |
| **Community** | Governance documented | ✅ GOVERNANCE.md |

### 7b. Outstanding Technical Debt (Consolidated from ALL Phases)

| # | From Phase | Description | Severity | Plan |
|---|---|---|---|---|
| 1 | Phase 6 | Coverage 87.06% < 90% jest threshold (VisionProUI 70.6%, ServiceWorkerManager 67.4%, WebXRSession 73.8%) | **HIGH** | Add unit tests for low-coverage modules |
| 2 | Phase 6 | No actual `sw.js` service worker file | **MEDIUM** | Create or integrate vite-plugin-pwa |
| 3 | Phase 6 | No server-side WebSocket handler (client-only RealtimeSync) | **MEDIUM** | Add `server/ws/` handler |
| 4 | Phase 6 | Docker ifcConvert pipeline is placeholder | **MEDIUM** | Obtain IfcOpenShell binary |
| 5 | Phase 5 | i18n service not wired into UI (no language switcher) | **MEDIUM** | Wire I18nService into UIController |
| 6 | Phase 5-7 | No E2E tests for Phase 5-7 features | **MEDIUM** | Extend Playwright test suite |
| 7 | Phase 7 | No `scripts/release.mjs` unit tests | **LOW** | Add test file |
| 8 | Phase 7 | No `server/index.ts` integration tests | **LOW** | Add supertest-based tests |
| 9 | Phase 7 | Sentry not wired (transport ready, no DSN) | **LOW** | Optional: add Sentry SDK |
| 10 | Phase 7 | `SECURITY.md` placeholder email | **LOW** | Replace with real contact |
| 11 | Phase 7 | `CODE_OF_CONDUCT.md` no enforcement contact | **LOW** | Add maintainer email |
| 12 | Phase 6 | Plugin sandbox is trust-based, not iframe/Worker isolated | **LOW** | Future: iframe sandbox for untrusted plugins |
| 13 | Phase 6 | No XR device testing (Vision Pro, WebXR) | **LOW** | Requires hardware |
| 14 | Phase 7 | `package.json` version 1.0.0 vs architecture.md header 2.0.0 | **LOW** | Bump to 2.0.0 at release |
| 15 | Phase 7 | nginx.conf missing COOP/CORP headers (present in Express middleware) | **LOW** | Add headers to nginx.conf |

### 7c. Project Completion Score

| Phase | Grade | Weight | Weighted Score |
|---|---|---|---|
| Phase 1 | B (83%) | 15% | 12.45 |
| Phase 2 | B (85%) | 15% | 12.75 |
| Phase 3 | B (84%) | 10% | 8.40 |
| Phase 4 | A- (90%) | 20% | 18.00 |
| Phase 5 | B+ (82%) | 20% | 16.40 |
| Phase 6 | B+ (88%) | 10% | 8.80 |
| Phase 7 | **B+ (88%)** | 10% | 8.80 |
| **Total** | | 100% | **85.60%** |

### 7d. Final Grade

**Phase 7 Grade: B+ (88%)**

**Justification:**
- All 4 tasks structurally complete with high-quality implementations
- 199 new unit tests (825 total), 4 dedicated test suites for security/monitoring
- 0 production vulnerabilities, comprehensive CSP, 3-tier rate limiting
- Full release engineering pipeline (semver, CHANGELOG, GitHub Release, Docker, PR preview)
- Complete governance and community infrastructure
- Deductions: coverage still below 90% jest threshold (-4), no Sentry wired (-2), no v2.0.0 tag/release (-3), no screenshots in feature guides (-2), SECURITY.md placeholder email (-1)

**Overall Project Grade: B+ (85.6%)**

---

## Final Recommendations

### 1. Is the project production-ready?

**Conditionally YES.** The codebase has:
- ✅ 825 passing tests with 87% statement coverage
- ✅ 0 production vulnerabilities
- ✅ CSP, HTTPS, rate limiting, input sanitization
- ✅ Error boundaries, structured logging, health checks
- ✅ Full CI/CD infrastructure (CI, release, preview, Docker)

**Conditions for production deployment:**
1. Fix coverage threshold — either lower jest thresholds to 85% or add tests to reach 90%
2. Replace `SECURITY.md` placeholder email
3. Bump `package.json` version and create `v2.0.0` tag
4. Wire actual service worker file if offline support is needed
5. Wire server-side WebSocket handler if real-time collaboration is needed

### 2. Remaining work for full production deployment
- **Critical:** Fix coverage regression or threshold mismatch (1 day)
- **Important:** Wire i18n into UI, add E2E tests for Phase 5-7 features (3-5 days)
- **Nice-to-have:** Sentry integration, actual ifcConvert Docker pipeline, XR device testing

### 3. Maintenance plan
- Dependabot weekly PRs for dependency updates
- `npm run release` for semver releases
- CHANGELOG auto-generated from conventional commits
- PR preview deployments for review before merge

### 4. Scaling considerations
- 1,307 kB JS bundle → consider code-splitting with dynamic imports
- In-memory server stores → migrate to Redis/PostgreSQL for multi-instance
- WebSocket collaboration → needs actual server handler for scaling
- Static assets → CDN deployment (nginx caching configured)
