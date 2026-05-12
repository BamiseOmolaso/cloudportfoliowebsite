# Security Policy

## Supported Versions

We actively support and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < Latest | :x:                |

---

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

### How to Report

1. **Email**: Send details to [davidbams3@gmail.com](mailto:davidbams3@gmail.com)
2. **Subject**: Include "[SECURITY]" in the subject line
3. **Details**: Provide:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution**: Depends on severity and complexity

### What to Include

- Type of vulnerability (XSS, SQL injection, etc.)
- Affected component/route
- Proof of concept (if safe to share)
- Suggested remediation

---

## Security Best Practices

### For Developers

#### 1. Environment Variables

- **Never commit** `.env` files
- Use `.env.example` for documentation
- Store secrets in secure vaults (AWS Secrets Manager, etc.)
- Rotate secrets regularly

#### 2. Input Validation

- Validate all user inputs using Zod schemas
- Sanitize HTML content before rendering
- Use parameterized queries (Prisma handles this)
- Validate file uploads (type, size, content)

#### 3. Authentication & Authorization

- Use JWT with secure secrets (min 32 characters)
- Implement rate limiting on auth endpoints
- Use secure, HTTP-only cookies for sessions
- Implement proper role-based access control

#### 4. API Security

- Implement rate limiting on all public endpoints
- Use CSRF protection for state-changing operations
- Validate Origin/Referer headers
- Return generic error messages (don't leak details)
- Use HTTPS in production

#### 5. Database Security

- Use connection pooling
- Implement proper access controls
- Use parameterized queries (Prisma)
- Regular backups
- Monitor for suspicious queries

#### 6. Dependencies

- Keep dependencies up to date
- Run `npm audit` regularly
- Review security advisories
- Remove unused dependencies

---

## Security Features

### Implemented Security Measures

#### 1. Input Sanitization

- **HTML Sanitization**: `isomorphic-dompurify` (DOMPurify on both client and server) via `src/lib/sanitize-server.ts`, with an allowlist of tags/attributes
- **Text Sanitization**: Email, subject, and text field sanitization
- **HTML-Escaping in Email Templates**: User-controlled fields (subscriber name, email, location) interpolated into outbound HTML are escaped to block stored XSS in admin notifications
- **XSS Protection**: All user inputs are sanitized before rendering

#### 2. Rate Limiting

- **Public Endpoints**: Rate limiting via Redis Cloud (production) or in-memory (development)
- **Admin Endpoints**: Stricter rate limits via `secureAdminRoute`
- **Per-IP Keying**: `withRateLimit` keys on `${endpoint}:${client_ip}` (derived from `x-forwarded-for` / `x-real-ip`) so one abusive client cannot lock out other users
- **Failed-Attempt Tracking**: `trackFailedAttempt` records IP + email + action type for CAPTCHA escalation

#### 3. Authentication

- **JWT-based**: Secure token-based authentication
- **Password Requirements**: Enforced via environment variables
- **Session Management**: Secure cookie handling

#### 4. CSRF Protection

- **Origin/Referer Validation**: Checks request headers
- **Token-based**: For state-changing operations
- **SameSite Cookies**: Prevents cross-site attacks

#### 5. Security Headers

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy` (configured per route)

#### 6. IP Blacklisting

- **Lookup path is wired**: `/api/newsletter/subscribe` checks `isIPBlacklisted()` on every request
- **Population path is manual**: `blacklistIP()` exists in `src/lib/security.ts` but is not currently invoked from automated triggers — operators add entries manually until an automatic-blacklist policy is wired in
- Configurable expiry (default 24h); permanent entries supported by passing `expiresAt = null`
- CAPTCHA escalation after 3+ failed attempts in 1 hour (`isCaptchaRequired`) currently provides the automatic-defence behaviour

#### 7. Audit Logging

- Admin actions logged
- Failed login attempts tracked
- Security events recorded

---

## Security Checklist

### Pre-Deployment

- [ ] All environment variables set and secure
- [ ] No hardcoded secrets in code
- [ ] Dependencies updated (`npm audit`)
- [ ] Rate limiting configured
- [ ] CSRF protection enabled
- [ ] Security headers set
- [ ] Input validation on all endpoints
- [ ] Authentication required for admin routes
- [ ] Error messages don't leak sensitive info
- [ ] HTTPS enforced in production
- [ ] Database credentials secure
- [ ] Logging configured (no sensitive data)

### Regular Maintenance

- [ ] Review security advisories monthly
- [ ] Update dependencies quarterly
- [ ] Review access logs weekly
- [ ] Rotate secrets quarterly
- [ ] Review audit logs monthly
- [ ] Test backup/restore procedures
- [ ] Review and update security policies

---

## Known Security Considerations

### 1. reCAPTCHA

- Required for newsletter subscription after failed attempts
- Site key is public (client-side)
- Secret key must be kept secure

### 2. JWT Secrets

- Must be at least 32 characters
- Should be randomly generated
- Must be kept secret
- Rotate periodically

### 3. Database Access

- Use connection strings with SSL
- Limit database user permissions
- Use read replicas for queries if possible
- Monitor for SQL injection attempts (though Prisma prevents this)

### 4. Email Service (Resend)

- API key must be kept secret
- Validate email addresses
- Rate limit email sending
- Monitor for abuse

### 5. Redis (Rate Limiting)

- REST URL and token must be kept secret
- Monitor for abuse patterns
- Configure appropriate rate limits

---

## Security Updates

Security updates are released as needed. We recommend:

1. **Monitoring**: Watch repository for security updates
2. **Updating**: Apply security patches promptly
3. **Testing**: Test updates in staging before production
4. **Backup**: Always backup before major updates

---

## Compliance

### Data Protection

- User data is stored securely
- GDPR considerations for EU users
- Privacy policy available at `/privacy-policy`
- Cookie consent management implemented

### Third-Party Services

- Resend (email): [Privacy Policy](https://resend.com/legal/privacy-policy)
- Google reCAPTCHA: [Privacy Policy](https://policies.google.com/privacy)
- Redis Cloud: [Privacy Policy](https://redis.com/legal/privacy-policy/)

---

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/going-to-production#security)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Prisma Security](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)

---

## Contact

For security concerns:
- **Email**: [davidbams3@gmail.com](mailto:davidbams3@gmail.com)
- **Subject**: Include "[SECURITY]" prefix

---

---

## Infrastructure Posture: Deliberate Cost Trade-offs

This is a personal-portfolio AWS stack optimised for cost (~$1-2/mo paused, ~$200-250/mo running). A few infrastructure defaults look like security gaps on a typical enterprise checklist but are kept this way on purpose to avoid recurring AWS charges:

- **RDS `publicly_accessible = true`** with a `var.admin_cidr_blocks` ingress (default `[]`, closed). Set to your home `IP/32` in `terraform.tfvars` when you need direct laptop access. Closing this entirely would require NAT (~$32/mo), a bastion EC2, or AWS Client VPN.
- **ECS Fargate tasks in public subnets with `assign_public_ip = true`.** Avoids the NAT gateway charge. Tasks have public IPs but are gated by an SG that only allows ingress from the ALB SG (port 3000 from `0.0.0.0/0` was removed in the hardening pass).
- **ALB HTTP-only by default.** HTTPS is opt-in via `var.acm_certificate_arn` — see `terraform/README.md` for the ACM cert request + DNS validation flow. When set, the ALB adds an HTTPS:443 listener (TLS 1.3 policy) and the HTTP listener becomes a 301 redirect.
- **Single-AZ RDS on dev/staging** — Multi-AZ would double the per-environment RDS cost.

These are conscious operator decisions, not oversights. Items still tracked as real backlog (not cost-driven) — wildcard IAM on the OIDC roles, missing CloudWatch alarms, `image_tag_mutability = MUTABLE` — are listed in `terraform/README.md` under "Real backlog (not cost-driven)".

---

**Last Updated:** May 12, 2026

