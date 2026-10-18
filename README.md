# RepoReady

**Evidence before green checkmarks.**

RepoReady is a free, local-first engineering-readiness tool for source repositories. It helps makers distinguish **verified facts** from **missing tests**, and scale checks to the kind of application they're building.

## Principles
- **Ledger above ego:** a PASS names the exact check it passed and its supporting evidence.
- **No fake security grades:** file-presence checks do not prove a system is secure.
- **Four honest outcomes:** PASS, FAIL, NOT TESTED, and NOT APPLICABLE.
- **Local first:** scan files in your browser without uploading source code.
- **Fit for purpose:** static websites, backend applications, and AI agents need different checks.
- **No secret values in reports:** findings include relative file paths, never captured credentials.

## First milestone
The v0.1 work is developed on a feature branch and reviewed through a pull request. It adds an original React/Vite browser interface, a narrow and testable local scanner, profile-based readiness checks, JSON evidence export, and a GitHub Pages deployment workflow.

> RepoReady is a development aid, not a penetration test, security certification, or substitute for a human review.

MIT License. © 2026 MichaelWave369.
