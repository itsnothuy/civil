# Governance — Civil BIM Viewer

> **Last updated:** 2026-03-24

This document describes the governance model for the Civil BIM Viewer project.

---

## Project Mission

Build and maintain an open-source, browser-based BIM/IFC viewer for civil and civic engineering that is accessible, performant, and extensible.

---

## Roles

### Maintainer

Maintainers have full repository access and are responsible for:

- Reviewing and merging pull requests
- Triaging issues and setting milestones
- Making release decisions (version bumps, changelog updates)
- Enforcing code quality standards (CI must pass, coverage thresholds met)
- Responding to security reports within 48 hours
- Upholding the [Code of Conduct](CODE_OF_CONDUCT.md)

**Current Maintainers:**

| Name | GitHub | Focus Area |
|------|--------|------------|
| Huy Nguyen | [@itsnothuy](https://github.com/itsnothuy) | Project lead, full stack |

### Contributor

Anyone who submits a pull request. Contributors must:

- Sign the [Contributor License Agreement](CLA.md) (required for dual licensing)
- Follow the [Contributing Guide](CONTRIBUTING.md)
- Ensure all CI checks pass before requesting review
- Respond to review feedback in a timely manner

### Community Member

Anyone who participates in issues, discussions, or uses the software. Community members are encouraged to:

- Report bugs via [issue templates](.github/ISSUE_TEMPLATE/)
- Request features with use-case descriptions
- Share the project with peers in civil engineering

---

## Decision Process

### Technical Decisions

1. **Small changes** (bug fixes, test additions, doc updates) — Maintainer approves and merges directly
2. **Medium changes** (new features, refactors) — Requires at least one maintainer review + CI green + CLA signed
3. **Large changes** (architecture changes, dependency swaps, breaking changes) — Requires discussion in a GitHub Issue first, consensus among maintainers, and a documented design decision

### Release Decisions

- **Patch releases** (x.y.Z) — Bug fixes only, any maintainer can release
- **Minor releases** (x.Y.0) — New features, backward-compatible, maintainer consensus
- **Major releases** (X.0.0) — Breaking changes, requires public discussion period (minimum 2 weeks)

### Conflict Resolution

1. Discuss in the relevant issue or PR
2. If no consensus, maintainers vote (simple majority)
3. If a tie persists, the project lead makes the final call

---

## Adding Maintainers

New maintainers are nominated by existing maintainers based on:

- Sustained, high-quality contributions over 3+ months
- Demonstrated understanding of the codebase and project goals
- Positive interactions with the community
- Willingness to commit to ongoing maintenance

The nomination requires approval from all existing maintainers.

---

## Removing Maintainers

A maintainer may be removed if they:

- Are inactive for 6+ months without prior notice
- Violate the Code of Conduct
- Consistently fail to meet maintainer responsibilities

Removal requires consensus among remaining maintainers.

---

## Security Policy

See [SECURITY.md](SECURITY.md) for vulnerability reporting procedures.

- Critical vulnerabilities: patched within 48 hours
- High severity: patched within 1 week
- Medium/Low: included in next scheduled release
- All security patches receive retrospective CVE if applicable

---

## Licensing

This project is dual-licensed:

- **Open source:** AGPL-3.0-or-later
- **Commercial:** Available via CLA for organizations that cannot comply with AGPL

All contributions require a signed CLA to enable dual licensing.

---

## Communication Channels

| Channel | Purpose |
|---------|---------|
| GitHub Issues | Bug reports, feature requests |
| GitHub Discussions | General questions, design proposals |
| Pull Requests | Code contributions, reviews |

---

## Community Outreach Plan

### Target Communities

- **OSArch** — Open-source architecture/engineering community
- **buildingSMART** — IFC/openBIM standards organization
- **Civil engineering forums** — Reddit r/civilengineering, Eng-Tips
- **Academic** — University civil engineering departments

### Outreach Activities

1. **Share on OSArch forums** — Announce releases, request feedback
2. **Conference talks** — Present at openBIM/AEC technology conferences
3. **Blog posts** — Publish technical articles about the architecture and features
4. **University partnerships** — Offer the viewer as a teaching tool for BIM courses
5. **Social media** — Regular updates on project milestones

---

## Amendments

This governance document can be amended by maintainer consensus. Proposed changes should be submitted as a PR with a 2-week discussion period.
