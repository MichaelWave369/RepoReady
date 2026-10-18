# Security policy

RepoReady v0.1 is an experimental local-first source-folder inspector. It does not execute source files or transmit selected file contents to a service. Do not treat its output as an independent security audit.

If you find a vulnerability, please avoid publishing credentials or live exploits in a public issue. Contact the repository maintainer privately through an appropriate GitHub security advisory or contact route if available.

## Scope
- Folder scanning uses browser File APIs with a 256 KB limit per eligible text file and a 1,500-file limit.
- The signatures are intentionally narrow and may produce false positives and false negatives.
- FAIL identifies a failed *narrow check*, not proof of exploitation.
- PASS does not imply absence of vulnerabilities.
- Exported JSON records file paths. Review reports before sharing when paths are sensitive.
