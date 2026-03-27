---
name: security-audit
description: |
  Security audit skill covering OWASP top 10, dependency scanning,
  and secure coding practices.
version: 1.0.0
---

# Security Audit Skill

## When This Skill Applies
- Security review of code changes
- Pre-deployment security check
- Dependency vulnerability assessment
- Secure coding guidance

## Do Not Use When
- Simple bug fix with no security implications
- Documentation-only changes
- Internal refactoring with no external interface changes

## Audit Process

### 1. OWASP Top 10 Check
- Injection (SQL, NoSQL, OS command, LDAP)
- Broken authentication
- Sensitive data exposure
- XML external entities (XXE)
- Broken access control
- Security misconfiguration
- Cross-site scripting (XSS)
- Insecure deserialization
- Using components with known vulnerabilities
- Insufficient logging and monitoring

### 2. Code-Level Security
- Input validation at system boundaries
- Output encoding/escaping
- Proper use of cryptography
- Secure session management
- CSRF protection
- File upload security

### 3. Dependency Audit
- Check for known vulnerabilities (npm audit, snyk)
- Review dependency licenses
- Identify outdated packages
- Assess transitive dependencies

### 4. Infrastructure Security
- Environment variable management
- Secret rotation practices
- Network security configuration
- Container security (if applicable)

### 5. Report Format
```markdown
## Security Audit Report

### Risk Summary
| Risk Level | Count |
|------------|-------|
| Critical   | 0     |
| High       | 0     |
| Medium     | 0     |
| Low        | 0     |

### Findings
{detailed findings with remediation steps}
```

## Examples

**Good**: "SQL injection at `db.ts:42`: `query(\`SELECT * FROM users WHERE id = ${userId}\`)` — Use parameterized query: `query('SELECT * FROM users WHERE id = $1', [userId])`." — Specific, with fix.

**Bad**: "The application may have security issues. Consider reviewing input validation." — Vague, not actionable.

## Escalation & Stop Conditions
- Critical vulnerability found → flag as blocking immediately, provide specific remediation
- Known CVE in dependency → flag with severity from CVE database
- If audit scope is too large → prioritize system boundaries and authentication paths

## Final Checklist
- [ ] OWASP Top 10 checked against changed code
- [ ] Input validation verified at system boundaries
- [ ] No hardcoded secrets or credentials
- [ ] Dependencies checked for known vulnerabilities
- [ ] All findings have severity ratings and file:line references
