# Classic Concepts: Full App Audit

**Audited:** `classicconcepts` (Next.js 16.2.10 App Router, React 19.2.4, Prisma 7 + SQLite, Tailwind 4, NextAuth 4 credentials, Cloudflare R2, Nodemailer/Gmail SMTP, ACRIO AI on Anthropic)
**Audit date:** 13 November 2026
**Auditor role:** designer, developer, security reviewer, AI-pattern and content analyst
**Codebase size:** 215 TypeScript/TSX source files, 31 admin screens, 24 API routes

---

## 0. How this audit was done, and what it does not cover

**Performed:**
- Full read-through of every API route, the auth/proxy layer, upload + storage path, email layer, caching layer, AI layer, admin settings screens, and the public chrome (header, footer, hero, product cards, cart, contact, payments).
- Static pattern sweeps across all source and agent files: em dashes, spaced en dashes, banned AI vocabulary, unverifiable marketing claims, `dangerouslySetInnerHTML`, secret handling, rate limiting, CORS.
- `npx tsc --noEmit` runs clean (exit 0), so nothing in this report is a compile-time defect.
- External references for the recommended hardening: Next.js 16 `proxy.ts` and CSP guidance, OWASP Next.js Security Cheat Sheet, OWASP Secure Headers, and DPDP Act 2023 / DPDP Rules 2025 notice requirements.

**Not performed (so do not treat these areas as "passed"):**
- No live penetration test, no authenticated browsing of `/admin`, no fuzzing of API routes, no dependency CVE scan (`npm audit`), no Lighthouse/Core Web Vitals run, no screen-reader run, no cross-browser or mobile device pass.
- No verification of factual claims (patent numbers, ISO certificate validity, client logos, "188 products") against source documents.
- Anything marked **[verify]** needs a human confirmation before you change or rely on it.

---

## 1. Executive summary

The engineering underneath this site is genuinely strong: typecheck is clean, admin mutations are guarded with `requireAdminSession()`, HTML is sanitised on write, uploads are extension-whitelisted and size-capped, cache invalidation is tagged, secrets are not committed, and the AI layer degrades to a local catalog matcher instead of breaking. The problems are concentrated in four places:

1. **No security header layer and no abuse limits.** No CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` or `Permissions-Policy` anywhere in `next.config.ts`. Public POST endpoints (`/api/contact`, `/api/checkout`, `/api/analytics`) have no throttling, and admin login has no brute-force protection.
2. **Customer-visible disclosure of internal machinery.** The AI panel prints "Claude Haiku 5.5 Ready", "Claude Haiku 5.5 • Instant Cache", "Local Catalog Match • AI Key Not Set" and the assistant itself tells visitors which model it runs on. On a B2B manufacturer site this reads as an unfinished tool, not as a feature.
3. **Claims that carry legal risk.** "Patented, Registered Design & Copyright Protected" is stamped on every podium card by default, plus "Market leader", "India's leading", "Two Decades of Excellence" (contradicting "Since 2008"), and payment badges for VISA/MasterCard where no card gateway exists.
4. **No privacy notice, no terms, no consent step** on two forms that collect name, email, phone, and full delivery address, in a jurisdiction (India, DPDP Act 2023) that requires notice at the point of collection.

The site is close to excellent. What remains is mainly the last 10 percent that separates "well-built app" from "trustworthy institutional manufacturer".

### Severity summary

| ID | Finding | Severity | Effort |
|---|---|---|---|
| S1 | No security headers (CSP, HSTS, frame, referrer, permissions, nosniff) | Critical | 1 h |
| S2 | `/api/contact` is an open email relay: anyone can make your Gmail send mail to any address | Critical | 2 h |
| S3 | Admin login has no rate limit, no lockout, no 2FA, and leaks account existence | Critical | 3 h |
| S4 | Client-controlled order total and prices in `/api/checkout` | High | 3 h |
| S5 | SMTP password rendered in plaintext into the admin settings HTML | High | 1 h |
| S6 | `?includeSecrets=1` exports SMTP password and AI keys as a downloadable JSON over GET | High | 2 h |
| S7 | Regex-only HTML sanitiser can be bypassed, then rendered via `dangerouslySetInnerHTML` | High | 3 h |
| S8 | Public uploads accept PDF/DOC/DOCX/ZIP/MP4 on a public bucket | Medium-High | 2 h |
| S9 | Rate limiting on AI/search is per-process and keyed on a spoofable header | Medium | 2 h |
| S10 | `/api/brand-info` is `Access-Control-Allow-Origin: *` and exposes staff phone/WhatsApp/email | Medium | 1 h |
| S11 | JWT-only authorisation: deleted admin keeps access, no roles, no audit log | Medium | 1 day |
| S12 | `/admin/setup` is a claimable first-run endpoint with no token and no password policy | Medium | 2 h |
| L1 | No privacy notice, consent, grievance contact, retention policy (DPDP) | High (legal) | 4 h |
| L2 | No Terms page although the cart says "you agree to our terms" | High (legal) | 2 h |
| L3 | Unverifiable patent/registered-design claims on every podium | High (legal) | 2 h |
| C1 | Internal AI/model labels shown to customers | High (brand) | 2 h |
| C2 | Site copy breaks its own plain-language and no-em-dash rules | Medium | 4 h |
| C3 | Claim inconsistencies: "two decades" vs "Since 2008", "market leader", "premium" | Medium | 2 h |
| D1 | Three competing blues, two navies, four radii in one design system | Medium | 1 day |
| D2 | Header carries 9 top-level items + CTA at 12 px uppercase | Medium | 4 h |
| D3 | Product card nests `<button>` inside `<Link>` (invalid, hostile to keyboard users) | Medium | 2 h |
| D4 | Price hidden on mobile cards while "Add" stays visible | Medium | 1 h |
| A1 | Icon-only controls lack accessible names; map iframe has no `title`; no skip link; no focus trap | Medium | 4 h |
| P1 | `force-dynamic` on every page + `images.unoptimized` defeats caching and image sizing | Medium | 1 day |

---

## 2. Security

### S1. No security headers at all. Critical.

`next.config.ts` (lines 1 to 45) sets `poweredByHeader: false` and `compress: true`, and stops there. There is no `headers()` block and `src/proxy.ts` adds only auth redirects. Consequences:

- Any XSS anywhere is unmitigated by CSP, and this app renders admin-supplied HTML in twelve `dangerouslySetInnerHTML` sinks (see S7).
- No `X-Frame-Options` or `frame-ancestors`: the site can be framed, so admin screens are clickjackable if a session is active.
- No HSTS: first-visit downgrade and cookie-stealing on hostile Wi-Fi.
- No `Referrer-Policy`: full URLs (including `/admin/enquiries/<id>`) leak to third parties.
- No `X-Content-Type-Options: nosniff`: an uploaded file served with a guessed type can be sniffed as HTML.

**Fix** (Next.js 16 supports `headers()` in config for static headers, and `proxy.ts` for a per-request nonce):

```ts
// next.config.ts
async headers() {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com", // tighten with a nonce once verified
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://www.google-analytics.com",
    "frame-src https://www.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
  return [{
    source: "/:path*",
    headers: [
      { key: "Content-Security-Policy", value: csp },
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ],
  }];
}
```

Ship CSP as `Content-Security-Policy-Report-Only` for one week first: the admin inline editor, Quill, and the injected analytics scripts (`headScripts` / `bodyScripts`) will otherwise break. Note that `Permissions-Policy: geolocation=()` is compatible with the Google Maps iframe.

### S2. `/api/contact` lets anyone send mail as Classic Concepts. Critical.

`src/app/api/contact/route.ts`, lines 8 to 45. The route validates only that four non-empty strings exist, writes an `Enquiry`, then calls `sendClientEnquiryThankYou({ name, email })`, which sends a branded email to **whatever address the caller typed**. There is no rate limit, no CAPTCHA, no verification, and no attempt to deduplicate.

Practical abuse: a script posts 5,000 rows with `email` set to victims, and your Gmail account sends 5,000 "Thank you for your enquiry" emails with your logo, SPF alignment, and links. Outcome: Gmail throttling or suspension, domain/IP reputation damage, and your sales replies landing in spam. It also lets an attacker bury a real enquiry flood.

**Fix, in order of value:**
1. Per-IP and per-email throttle (see the helper in section 14), for example 3 per 10 minutes per IP, 2 per hour per email.
2. Only send the auto-reply when the address passes a lightweight check: MX lookup plus a disposable-domain denylist. Cheapest reliable option is a managed form token or CAPTCHA.
3. Add a honeypot field plus a minimum fill-time check in `ContactForm.tsx`.
4. Log and alert on auto-reply volume; alarm above 20 per hour.
5. Validate format: `email` currently only gets `.trim().slice(0,200)`, so `not-an-email` is accepted and later fed into Nodemailer.

The same applies to `/api/checkout`, which also sends `sendClientOrderThankYou` to a caller-supplied address.

### S3. Admin login is unthrottled, enumerable, and single-factor. Critical.

`src/lib/auth.ts`, lines 17 to 43:

- No attempt counter, delay, or lockout on either the API route or the login page.
- Distinct error strings, `"No admin found with this email"` and `"Incorrect password"`, confirm which email exists. For a site whose admin email is printed in the footer and on `/contact`, that removes the first half of the attack entirely.
- `bcrypt` cost 10 is acceptable but should be 12 for a single-account system.
- No `session.maxAge`. NextAuth defaults to 30 days, so a stolen JWT is valid for a month.
- No 2FA and no password policy (`src/app/admin/setup/page.tsx` accepts `a` as a password).
- No failed-login logging, so an attack leaves no trace.

**Fix:**
1. One generic message: `"Email or password is incorrect"`.
2. Move to `bcrypt.hash(password, 12)` on next password change; support rehash-on-login.
3. Add `session: { maxAge: 60 * 60 * 8, updateAge: 60 * 60 }` and `jwt: { maxAge: 8 * 60 * 60 }`. Eight hours is plenty for an admin panel.
4. Rate limit by IP **and** by email with a 5-attempt, 15-minute lockout, keyed in Redis (you already run `ioredis`), not in process memory.
5. Enforce 12+ characters at setup, and add TOTP. `otplib` plus a QR in settings is a small job and removes the entire credential-stuffing risk.
6. Log `{ ts, ip, email, outcome }` for every attempt to a table the dashboard can show.

### S4. Order totals are trusted from the browser. High.

`src/app/api/checkout/route.ts`, lines 26 to 52. `price` comes straight from `cartItems[].price`, is only checked for being a finite non-negative number, and `cartTotal` is computed from it. The client controls both the line price and the sum, so an order can be recorded at 1 rupee (or 0) with the real product names and quantities. There is no server lookup of `productId`.

Even without payment collection, this corrupts the enquiry pipeline and gives a customer a screenshot-able "estimated total" your staff must argue with.

**Fix:** load the real products server side and recompute:

```ts
const ids = sanitizedItems.map(i => i.productId);
const dbProducts = await prisma.product.findMany({
  where: { id: { in: ids } },
  select: { id: true, name: true, sku: true, basePrice: true, discountPrice: true },
});
// rebuild line items from DB, ignore client name/price entirely, reject unknown ids
```

Also reject `cartItems.length > 50` before mapping (currently sliced to 100 silently, which hides abuse), validate `pincode` against `/^\d{6}$/`, and cap `address` at 500 chars.

### S5. SMTP password printed into the settings page HTML. High.

`src/app/admin/(dashboard)/settings/page.tsx`, line 568: `defaultValue={settings?.smtpPass || ""}` on a `type="password"` input. `type=password` masks the screen, not the DOM. The app password sits in the HTML source of every settings load, reachable by any browser extension, any XSS (see S7), any screen-share, and any HTML snapshot saved to disk.

**Fix:** mirror what you already do for the Anthropic keys. Render a hint like `App Password Saved (••••abcd)` plus an empty input and a "Replace" checkbox. Treat an empty submit as "keep existing".

Related: `src/lib/email.ts` line ~243 reads `settings.smtpPass` from the database. An email app password belongs in an environment variable, not a SQLite row that admins can dump and that gets exported (S6).

### S6. `includeSecrets=1` exports live secrets over GET. High.

`src/app/api/admin/import-export/route.ts` accepts `?bundle=site-settings&includeSecrets=1` and returns a JSON download containing `smtpPass`, `anthropicApiKey`, `anthropicClientApiKey`, `anthropicAdminApiKey` (`src/lib/data-import-export.ts`, lines 19 to 22 and 690 to 736).

Why this is worse than it looks:
- A GET with side-effect-free appearance lands in server access logs, proxy logs, and browser history, with the trigger visible as a URL.
- The response is a file that admins habitually drop into WhatsApp or email while "backing up".
- `requireAdminSession()` is the only control, so any XSS or stolen session converts directly into API key and SMTP takeover.

**Fix:** remove `includeSecrets` from the HTTP surface entirely. Backups should never carry credentials. If you truly need a full-fidelity export for disaster recovery, write it to disk on the server (`backups/` already exists) and keep it out of any response body. Then rotate the Anthropic and Gmail app passwords, because they may already have been downloaded.

### S7. Regex sanitiser plus `dangerouslySetInnerHTML`. High.

`src/app/api/admin/inline-edit/route.ts`, lines 86 to 91 and 232 to 240:

```ts
function stripDangerousHtml(raw: string): string {
  return raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "");
}
```

Both patterns require quotes and both miss obvious payloads: `<img src=x onerror=alert(document.cookie)>` (unquoted attribute) and `<svg><animate onbegin=alert(1)>` survive. That value is then stored and rendered through `dangerouslySetInnerHTML` at `src/components/inline-edit/EditableText.tsx` lines 235 and 334, `src/app/shop/c/[slug]/page.tsx` line 181, `src/app/podiums/[slug]/page.tsx` lines 143 and 149, `src/app/shop/p/[slug]/page.tsx` lines 183 and 189, and `src/components/home/ProblemStatements.tsx` / `Industries.tsx` line 197.

Attacker-to-victim path: any admin session (or a compromised admin password, which is unthrottled and un-2FA'd, see S3) can plant a persistent script that fires for other admins and, via `/api/admin/import-export`, harvests the SMTP password and AI keys. Stored XSS in an admin panel is privilege escalation, not a nuisance.

**Fix:** use a real allowlist sanitiser on the server before storage, `sanitize-html` or `isomorphic-dompurify`, with an explicit tag and attribute allowlist (`p, br, strong, em, u, ul, ol, li, a[href], span[class,style]`) and `allowedStyles` limited to colour, weight, size. Keep `sanitizeRichHtml` and delete `stripDangerousHtml`. Add a CSP from S1 as the second layer.

### S8. Public bucket accepts PDF, DOC, DOCX, ZIP, MP4, WEBM. Medium-High.

`src/app/api/upload/route.ts`, lines 19 to 33 and 86 to 95. Extensions are whitelisted and SVG/HTML are correctly excluded, which is good. But:

- Files go to the **public** R2 URL with no `Content-Disposition`, no per-object policy, and a name-only MIME mapping. A `.zip` or `.pdf` hosted on `cdn.classicconcepts.in` is free file hosting under your brand, and a common malware distribution step.
- `file.type` is only a fallback, so the declared MIME always matches the extension. That is correct, but the browser will still open a PDF inline with its JS engine.
- No image re-encode means an uploaded "JPG" can carry a polyglot payload for any downstream system that trusts the extension.

**Fix:** split the endpoint. `POST /api/upload/image` accepts `jpg/jpeg/png/webp` only, re-encodes through `sharp` and strips metadata. `POST /api/upload/document` (admin-only already) writes to a **private** bucket and returns a signed URL with `Content-Disposition: attachment`. Never expose ZIP or video from the public asset domain.

### S9. Rate limiting is per-process and header-spoofable. Medium.

`src/lib/ai-context.ts`, `checkPublicAiRateLimit` (around line 690): a `Map` on `globalThis`, emptied on every deploy or restart, with a 500-key FIFO eviction. With `instances: 1` in `ecosystem.config.cjs` this mostly works, but any restart resets every counter. The key is `x-forwarded-for.split(",")[0]` (`src/app/api/ai/search/route.ts` line 8, `src/app/api/ai/concierge/route.ts` line 14), which a client can set freely unless a trusted proxy overwrites it.

Worse, the AI is on by default in `POST /api/ai/search` (`const requestedAi = body?.useAi !== false;`, line 52), so any script can burn Anthropic credits at 20 requests per 10 minutes per fake IP.

**Fix:**
1. Confirm your reverse proxy (nginx/Caddy) overwrites `X-Forwarded-For` and only then read the rightmost, or better, read a trusted `CF-Connecting-IP`.
2. Move the counter to Redis (`INCR` + `EXPIRE`) so it survives restarts and is shared across workers.
3. Add a global daily cap, for example 2,000 AI calls per day, and fall back to the local matcher past that. The local matcher already returns good results, so the UX cost is small.
4. Require `useAi: true` explicitly instead of defaulting on.

### S10. `/api/brand-info` is a wide-open PII endpoint. Medium.

`src/app/api/brand-info/route.ts`, lines 8 to 13: `Access-Control-Allow-Origin: *`, and the payload includes every team member's `phone`, `whatsapp`, `email`, and `bio`, plus every client logo, every certificate URL, and the UPI ID. Any site can pull this into a scraper or clone your brand page with your real contact details, which is a known impersonation pattern.

**Fix:** restrict CORS to an explicit allowlist (`https://classicconcepts.in`, `https://classicedge53.com`), or drop CORS entirely if only own-origin pages consume it. Split team contact data behind an authenticated or at least origin-checked route, and return only `name`, `position`, `photoUrl` publicly. A business phone number in the footer is fine; a per-employee mobile and email dump is not.

### S11. Authorisation is JWT-claim-only. Medium.

`requireAdminSession()` (`src/lib/auth.ts`, lines 45 to 51) checks `session.user.email` and nothing else. There is one role, no `Admin.isActive` flag, and no per-record ownership. Consequences:

- Remove or disable an admin row and their token keeps working until expiry (30 days today).
- No audit trail of who edited what. The inline editor can rewrite prices and descriptions with no record.
- Anything that ever issues a token for another audience shares the same privilege.

**Fix:** add `isActive` to `Admin`, resolve the admin in `requireAdminSession()` with a cached `findUnique`, and reject inactive accounts. Add an `AdminAction` log (`adminId`, `action`, `entity`, `entityId`, `diffJson`, `ip`, `createdAt`) written from `inline-edit`, `taxonomy`, `import-export`, and the settings action. That log is also what you need when a price changes unexpectedly.

### S12. `/admin/setup` can be claimed by the first visitor. Medium.

`src/app/admin/setup/page.tsx`, lines 8 to 42. The guard is `if (adminCount > 0) redirect(...)`. If the production database is ever empty, freshly restored, or mid-migration, the first visitor creates a permanent administrator with an arbitrary email and a one-character password. `src/proxy.ts` explicitly exempts `/admin/setup` from auth.

**Fix:** gate it behind an `ADMIN_SETUP_TOKEN` environment variable compared in constant time and passed in the query string, disable the route entirely when `NODE_ENV === "production"` and an admin already exists (keep that), and enforce a 12-character minimum with a strength check. Alternatively, move bootstrap to a CLI script (`scripts/create-admin.mjs`) and delete the route.

### S13. Smaller security notes

- **`/api/cache/warm` loopback bypass** (`src/app/api/cache/warm/route.ts`, lines 8 to 15): trusts the `Host` header, which is attacker-controlled unless the proxy normalises it. Compare `req.headers.get("x-forwarded-for")` and the socket address instead, or require admin always.
- **No CSRF tokens on custom admin POST routes.** NextAuth's session cookie defaults to `SameSite=Lax`, which blocks cross-site POSTs, so this is currently mitigated. Do not change `sameSite` without adding tokens.
- **`images.remotePatterns` allows `hostname: "**"` for both protocols** (`next.config.ts`, lines 20 to 31). Harmless while `unoptimized: true`; if anyone removes that flag, it becomes an SSRF surface for arbitrary host fetches.
- **`/api/analytics` is unauthenticated and writes paths** (`src/app/api/analytics/route.ts`). Validation is decent (must start with `/`, max 200 chars), but paths are unbounded rows. A bot can create thousands of `PageVisit` rows. Cap stored paths to a known route allowlist plus a `__other__` bucket, and ignore obvious bot user agents.
- **Email header and attribute injection** (`src/lib/email.ts`). `infoRow` builds `href="...${encodeURI(value)}"`, and `encodeURI` does not encode `"`, so a `phone` value like `+91" onmouseover="..."` injects an attribute into the internal admin notification. `getEmailLayout` interpolates `preheader` unescaped, and subjects interpolate `data.name`. Escape all three.
- **`R2_TOKEN` and seven other secrets sit in `.env`.** Correctly untracked (confirmed: `git ls-files` shows only `.env.example`), so no leak. But rotate anything that has been pasted into chat, screenshots, or the S6 export.
- **`bcrypt` at cost 10, `Admin.email` unique, no password reset flow.** The only recovery is direct DB access. Acceptable for one account, but document it.

---

## 3. Privacy, legal, and trust

### L1. No privacy notice, no consent, no grievance contact. High.

`grep` for `privacy|terms|cookies|refund` across `src` returns **zero** matches. Yet:

- `/contact` collects name, email, phone, message (`src/components/ContactForm.tsx`).
- `/cart` collects name, email, phone, full street address, city, state, pincode, plus notes (`src/app/cart/CartClient.tsx`, lines 180 to 300).
- `/api/analytics` records every page path per session, client side (`src/components/layout/CustomAnalyticsInjector.tsx`, lines 20 to 55).
- Optional GA and arbitrary third-party scripts are injected from settings.

Under the DPDP Act 2023 with the Rules notified in November 2025, a site collecting a name, phone, or email from people in India needs: a plain-language notice **at the point of collection** (itemised data, purpose, how to withdraw, how to complain), genuine consent (not bundled, not pre-ticked), data minimisation, a retention limit, a published grievance contact, and the ability to erase on request. A footer link alone does not satisfy the notice duty for a form being filled in now. You also have no retention job and no documented erasure path for `Enquiry`, `CartOrder`, and `PageVisit`.

**Fix (4 to 6 hours of work, no engineering risk):**
1. Create `/privacy` with: what is collected, why, how long (suggest 24 months for enquiries, 90 days for analytics), who processes it (Gmail, Cloudflare, Anthropic for AI queries, Google Analytics if enabled), the grievance officer's name/email/phone, the right to withdraw and erase, and the right to complain to the Data Protection Board.
2. Add one line under each submit button: "We use your name, phone, and email only to reply to this enquiry. Details in our Privacy Policy." with a link.
3. Add an unticked marketing checkbox if you ever want to send offers. Do not bundle it.
4. Make `phone` optional in `ContactForm` if email is enough to reply (data minimisation).
5. Store consent proof: `consentAt`, `noticeVersion`, `formName` on `Enquiry` and `CartOrder`.
6. Add a scheduled deletion job and a "delete my data" email that routes to the grievance officer.

### L2. No Terms page, but the cart claims agreement. High.

`src/app/cart/CartClient.tsx`, line 342: *"By submitting, you agree to our terms."* Those terms do not exist anywhere on the site. That sentence is unenforceable and looks careless to an institutional buyer's legal team.

**Fix:** publish `/terms` covering quotation validity, GST and freight, lead times, 50 percent advance, cancellation, warranty exclusions, force majeure, jurisdiction (Hyderabad), and IP. Link it from the footer, the cart, and `/online-payments`. Then rewrite the line as "By submitting, you agree to our Terms of Sale and Privacy Policy" with both linked.

### L3. Patent and registered-design claims are stamped on every podium. High.

Three places assert registered IP as fact:

- `src/components/shop/ProductCard.tsx`, line 13: *"Patented, Registered Design & Copyright Protected by Classic Concepts Acrylic Pvt. Ltd. Official IP documents are held on file. Unauthorised copying is strictly prohibited."* This is the **default** for every product where `isPodium` is true, and the badge reads "Patented & Copyrighted" (line 198).
- `src/components/home/Hero.tsx`, line 27: *"crafting patented podiums"*.
- `src/app/podiums/page.tsx`, line 147: *"Patented & Copyright Protected Designs"*, and `src/app/about/page.tsx`, line 66: *"Patented Designs"*.

In India a **patent** and a **registered design** are different rights (Patents Act 1970 vs Designs Act 2000), and copyright does not cover a functional shape. Claiming all three on 27 models when certificates may cover only some is a misrepresentation risk under consumer law, and it hands a competitor an easy credibility attack. Your own `changesrequired.md` already flags this and recommends the safer phrasing.

**Fix:** switch the default to *"Original Classic Concepts design. Protected through registered industrial design rights where applicable."* Show a `Registered Design` badge and `Design No.` only on products where `designRegistrationNo` is actually populated. Get the certificate list from the client and audit `/about/certificates` to match. Remove "patented" from the Hero unless a patent number can be printed.

### L4. Payment page invites fraud. Medium-High.

`src/app/online-payments/page.tsx`, lines 14 to 24, publishes the full account number, IFSC, bank branch, and address, with these copy problems:

- *"get a preapproval through Whatsapp number at +91-733 7222 876"* is misspelled and vague. A customer cannot tell what "preapproval" means or what to send.
- *"Note: When depositing cash in our bank account, kindly add Rs. 300 as a service charge."* This reads like an informal surcharge and is exactly the kind of line a finance team queries. Either price it properly or remove it.
- No anti-fraud warning. Public account details are a known target: attackers send "updated bank details" emails to your customers using this page as cover.

**Fix:** add a prominent line: *"We never change our bank details over email or WhatsApp without a signed letter on company letterhead. Please call +91 73372 22876 to confirm before transferring."* Add "Please quote your proforma invoice number in the remarks." Drop the cash-deposit surcharge line or move it into `/terms`. And remove the VISA/MasterCard badges in `src/components/layout/Footer.tsx` lines 419 to 433 unless a card gateway actually exists. Right now they promise a payment method you cannot accept, which is both a trust problem and a consumer-protection one.

### L5. Client logos and testimonials. **[verify]**

`/about/clients` and the homepage `Clients` component show 100+ company marks, including Tata, Google, ISRO, L&T, KIMS, ITC Hotels, Sony, Philips. Many of those brands restrict logo use in supplier marketing. Keep a written permission file per logo, or group them as "selected clients" text names rather than reproducing marks. This is the single most common cease-and-desist trigger for Indian B2B sites.

---

## 4. Things the customer should never see

This is the category you specifically asked about: internals leaking into customer view.

| What the customer sees | Where | Why it must go |
|---|---|---|
| "Claude Haiku 5.5 Ready" and "Claude Haiku 5.5 • Instant Cache" chips | `src/lib/ai.ts` lines 279 to 283 and 333, rendered in `src/components/ai/GlobalSearchModal.tsx` lines 410 to 427 and `ShopSmartSearchBar.tsx` lines 190 to 205 | Model names and cache state are engineering detail. On a manufacturer site they say "this is a demo". Replace with a single neutral chip: "ACRIO Catalog Match" or nothing. |
| "Local Catalog Match • AI Key Not Set" | same | Tells the visitor your billing is not configured. Never surface config state. |
| ACRIO answering "which AI are you?" with a model name | `src/lib/ai-context.ts` line 1338 | An assistant that discusses its own stack invites prompt-injection games and reads as a chatbot demo. Answer with capability: "I'm ACRIO. I match what you describe to our catalog." |
| `model`, `clientAiConfigured`, `adminAiConfigured` in a public JSON response | `src/app/api/ai/status/route.ts` lines 20 to 45 | Reconnaissance for nobody's benefit. Keep `isAdmin`, `popupEnabled`, `popupDelaySeconds`. Drop model keys from the public response. |
| "Admin Edit" dock, hover pencils, "Specs / Videos" chips | `InlineEditProvider.tsx`, `EditableText`, `ProductCard.tsx` line 112 | Correctly admin-gated, so fine functionally. Just be aware the whole inline-edit surface ships to every visitor as client JS. |
| Staff mobile numbers, WhatsApp, and personal emails in a CORS-open API | `src/app/api/brand-info/route.ts` | See S10. Public should be name, role, photo. |
| "Website Managed by The Web Sensei" with a link to `alaqmar.dev` | `src/components/layout/Footer.tsx`, lines 445 to 453 | A vendor credit in the footer of an established manufacturer undermines the "16,000 sq ft factory" story. If it is contractual, make it subtle and non-linked; otherwise remove it. |
| "Two Decades of Excellence" tagline | `src/app/api/brand-info/route.ts` line 54 | Contradicts "Since 2008" (18 years in 2026) and will be the first thing a competitor screenshots. |
| "Admin Note:" amber boxes | `GlobalSearchModal.tsx` line 447, `ShopSmartSearchBar.tsx` line 231 | Correctly `isAdmin`-gated. Keep, but never let them render on production screenshots sent to clients. |
| Raw error text from admin APIs | `src/app/api/admin/inline-edit/route.ts` line 500, `cache/route.ts` | Returns `error.message` straight to the client. Admin-only, but it can expose SQL or file paths in screenshots. Map to friendly strings. |
| Internal docs in the repo root: `changesrequired.md` (a full strategy memo), `inputs.txt` (1,928 lines of spec), `refactor.js`, `refactor-all.js`, `update.sh`, `backups/` | repo root | Not served by Next, but they are one misconfigured static host or one `git archive` away from public. Move to `docs/` and add to `.gitignore` if they are working notes. |

**Also worth removing:** the duplicate `/api/admin/me` endpoint (superseded by `/api/ai/status`), and the dead `src/components/ai/CustomerConciergeModal.tsx` that now returns `null`.

---

## 5. Copy, tone, and anti-AI-pattern violations

Your own `agents/ai-writing-rules.md` and `.agents/rules/plain-language-no-ai-patterns.md` ban em dashes, spaced en dashes, and a specific list of buzzwords. The AI output is filtered (`cleanAiPatterns`), but **hard-coded site copy is not**, so the rules are enforced on the machine-written text and broken on the handwritten text. That is backwards.

### 5.1 Banned vocabulary in live public copy

| File | Line | Text | Problem |
|---|---|---|---|
| `src/app/about/infrastructure/page.tsx` | 78 | "Every product is made with **meticulous** attention to detail, delivering durability, ease of handling and an elegant finish**—**all at competitive prices." | Banned word plus an em dash in the same sentence. |
| `src/app/about/press/page.tsx` | 20 | "Each product is **meticulously** crafted... **state-of-the-art** equipment... **cutting-edge** technology... **collaborative** approach" | Four banned or near-banned phrases in one boilerplate paragraph. This reads as agency filler from 2015. |
| `src/app/about/infrastructure/page.tsx` | 78 | "over two decades of experience" | Factually wrong (2008 to 2026 is 18 years). |
| `src/app/about/team/page.tsx` | 59 | "With over two decades of experience..." | Same. |
| `src/app/about/team/page.tsx` | 18 | metadata description uses an em dash | Em dash in a Google snippet. |
| `src/app/layout.tsx` | 54 | "**Market leader** in acrylic manufacturing" | Unverifiable superlative in the OpenGraph description. |
| `src/app/podiums/[slug]/page.tsx` | 33 | "**India's leading** acrylic podium manufacturer" | Unverifiable. Use "one of India's leading" only if you can defend it. |
| `src/lib/email.ts` | 327 | "premium acrylic products with **unmatched craftsmanship**... custom solutions **—** we're here to help" | Customer-facing email breaking two rules. |
| `src/lib/email.ts` | 452 | "**24–48 hours**" | Spaced en dash, banned. |
| `src/lib/email.ts` | 525 | subject "Re: Your Enquiry **—** Classic Concepts" | Em dash in a subject line, in the one place a customer always reads. |

### 5.2 Grammatical and consistency defects

- `src/components/home/Hero.tsx`, line 22: **"Original Acrylic Podiums & Custom Displays Made Built to Last"**. "Made Built" is a typo, and this is the H1 on the homepage, the single most-read sentence on the site. Suggested: *"Clear Acrylic Podiums and Custom Displays, Made to Last."*
- Hero defaults carry a full year-plus of drift: the component's H1 fallback, the `SiteContent` override, the subtitle, and the JSON-LD all say slightly different things. Decide one sentence and put it in one place.
- `Header.tsx` line ~268 uses the label "ACRYLIC PODIUM" (singular) while `/podiums` and the footer say "Acrylic Podiums". Same for "OTHER USEFUL LINKS", which is vague and, per your own `changesrequired.md`, was meant to become "Resources".
- `about/page.tsx` line 66 says "Patented Designs" while the same page's story block says "registered design and copyright protection". Two different legal claims 40 lines apart.
- `Footer.tsx` offers "Acrylic Interiors" and "Acrylic Display Units" as fallbacks when no categories load, but those are not real category pages. Dead-end links.
- `Hero.tsx` CTA says "Explore Collection →" while the section below is a product catalog, and the other CTA says "Shop Podiums". "Collection" is fashion vocabulary, not B2B manufacturing.
- `cart` disclaimer "you agree to our terms" with no terms (see L2).
- `/online-payments` "get a preapproval" (see L4).

### 5.3 Em dashes by count

64 occurrences across `src`. Most are internal admin labels (`label={`Category Name — ${cat.name}`}`) which customers never see, so they are low priority. The ones that matter are the **six public ones** listed in 5.1 plus `about/team` and `about/infrastructure`. If you want the rule enforced like a lint rule, add this to CI:

```bash
# fails the build on em dashes in customer-facing source
grep -rn "—" src --include=*.tsx | grep -v "label=" && exit 1
```

Careful: `src/lib/ai-context.ts` and `src/lib/ai-writing-rules.ts` legitimately contain em dashes inside the *instructions* that ban them. Exclude those two files.

---

## 6. Design and style

### D1. The palette has drifted into three blues, two navies, and three reds.

Used across the app:

| Token | Values found | Where |
|---|---|---|
| Primary blue | `#0056b3`, `#0047e1`, `#3b82f6`, `#60a5fa` | Header CTA, hero CTA, product buttons, footer hovers |
| Navy | `#0c1a40`, `#0a0f1c`, `#05060A`, `#02040a`, `#0d1f4d` | Footer, header, hero, CTA section |
| Red | `#e31837`, `#9b1539`, `#8b1538`, `#f43f5e`, `#ff4d6d` | Badges, gradients, accents |
| Radius | `rounded-sm`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-[2rem]`, `rounded-full` | Same page, adjacent components |

`globals.css` defines `--color-brand-blue: #0056b3` and `--color-brand-red: #e31837`, then almost every component hard-codes hex values instead of using them. Symptom: the header CTA (`#0047e1`) and the contact form button (`#0056b3`) are visibly different blues sitting one scroll apart.

**Fix:** commit to one blue (`#0056b3`), one accent red (`#e31837`), one navy (`#0c1a40`), one radius scale (12 / 16 / 24 / full), and expose them as Tailwind v4 theme tokens. Then replace hard-coded hexes with `bg-brand-blue`, `rounded-card`, and so on. This is the single highest-leverage visual change in the report.

### D2. The header is over capacity.

`Header.tsx` renders HOME, ABOUT US (5 items), PRODUCTS (all categories), ACRYLIC PODIUM (subcategories), CERTIFICATES, RESOURCES, MACHINES, OTHER USEFUL LINKS, CONTACT US, plus search, cart, and CTA. That is nine top-level items at `text-[12px]` uppercase with `tracking-wider`, in one `gap-7` row. At 1024 px it overflows and fights the logo. Institutional buyers scan for three things: products, industries, contact. Everything else is secondary.

**Fix:** per your own `changesrequired.md`, move to six items: PRODUCTS, INDUSTRIES, CUSTOM FABRICATION, PODIUMS, PROJECTS, CONTACT, with "GET A QUOTE" as the CTA and ABOUT plus RESOURCES folded into a single "Company" menu. Raise the nav to 13 px and drop the letter-spacing to `tracking-wide`. Use full-width mega-menu panels for Products and Industries instead of a 256 px scrolling dropdown, which currently needs a scrollbar to reach the 12th category.

### D3. Product cards are invalid HTML and hostile to keyboards.

`src/components/shop/ProductCard.tsx` wraps the entire card in `<Link>` (line ~95) and then places two `<button>` elements inside it (lines ~355 and ~365), plus an `<Info>` button for the IP popover. Nested interactive content is invalid HTML, and screen readers announce the add-to-cart control as part of a link. `e.preventDefault()` saves the click behaviour but not the semantics.

**Fix:** card becomes a `<div>` with a stretched-link `<Link>` on the image and title only, and the actions live as siblings. Keep the visual "whole card is clickable" using `after:absolute after:inset-0` on the title link and `relative z-10` on the buttons.

### D4. Price is hidden on mobile, but "Add" is not.

`ProductCard.tsx` line ~318 comment says "Price row: hidden on mobile per mobile declutter specification", and the stock badge too, while `Add` and `Enquire` stay. So on the most common device a customer can add an item to a quote cart without ever seeing a price. For a B2B buyer already unsure whether you are a retailer or a factory, that is the exact moment of distrust.

**Fix:** show a single compact price line on mobile (`₹23,100` at 12 px, or "Price on request") and keep MRP plus the discount pill hidden. One line, no clutter, no surprise.

### D5. Hero is visually loud and slow.

`Hero.tsx` stacks: a full-bleed photo, a three-stop dark gradient, two 150 px blurred animated blobs, four glassmorphism pill badges with hover lifts, a gradient-text headline (blue to purple to red), a gradient CTA, an outlined CTA, and `min-h-screen`. Five competing focal points before the first product. It also ships `hero.png` unoptimized at whatever size the file is (see P1).

**Fix:** keep the photo, one gradient scrim, the H1, one sentence, two buttons, and a single trust strip ("Since 2008 · 16,000 sq ft · ISO 9001:2015"). Drop the four pills or fold them into that strip. Remove the blobs. Add the search bar your spec calls for ("What are you looking for?") because that is what a buyer with a specific item actually needs.

### D6. Spacing and container rhythm are inconsistent.

`py-12` on cart, `py-16` on contact, `py-20` on press, `py-24` on the home CTA. Section headings vary between `text-2xl`, `text-3xl md:text-4xl`, `text-4xl md:text-5xl`. `globals.css` sets `.container` to `max-width: 100% !important`, which means no page ever has a designed maximum width; on a 27-inch monitor, text runs uncomfortably wide. That override also fights Tailwind's own container and surprises anyone maintaining this later.

**Fix:** define a `Section` component with two or three density variants, and give the container a real `max-width` (1280 px) with `!important` removed.

### D7. Admin UI is a different product.

The dashboard uses `#0056b3`, `slate`, and `shadow-soft`, which is consistent. But terms drift: "Backup / Sync" vs "Import & Export", "ACRIO" vs "ACRIO Admin Co-Pilot", "New Product" vs "Add Product". Not urgent, but standardise labels and add an empty-state to `/admin/enquiries` for zero results.

---

## 7. UX and conversion

1. **Two competing conversion models.** Every product offers `Add` (cart) and `Enquire` (WhatsApp), the header offers `Quick Enquiry`, and the footer and product pages mention quotes. For a factory that quotes per order, a cart with no checkout or payment is a museum of abandoned intent. Pick one primary: `Get a Quote` opens a form pre-filled with SKU, name, and a photo upload. Keep WhatsApp as the secondary shortcut. Either remove the cart or rename it "Quote List" everywhere, including the header icon (currently a shopping trolley).
2. **Cart asks for a street address but never charges.** "Request Checkout" plus full delivery address plus "Estimated Total" reads like an online order. It is really a quote request. Rename to "Request a Quote" and drop `address` or mark it optional. That also reduces personal data collected (L1).
3. **No price on request guidance.** `ProductCard` shows "Price on Request" with no reason and no next step. Add one line: "Final price depends on size, thickness, and quantity. Send your requirement and we will confirm in a few hours."
4. **No lead time, warranty, or shipping reassurance on the detail page above the fold.** Your spec calls for it, and it is the top hesitation for a ₹25k plus purchase.
5. **No way to compare podiums** despite a 27-model range. Your spec lists a 3-model comparison tool; it is not built. Without it, buyers bounce to competitors or WhatsApp, and you pay staff time to answer it manually.
6. **The `/podiums` range story is buried.** Essential / Signature / Premium is the core merchandising idea, and it should be three cards at the very top, not a strip halfway down.
7. **`/shop` has no visible empty state or "0 results" recovery.** Search with no match should offer the three nearest categories plus WhatsApp.
8. **Contact form has no file upload** even though custom fabrication is the highest-margin segment and the spec calls for a drawing or photo upload.
9. **No visible response-time promise.** "We reply within 24 working hours" is free trust. `email.ts` already promises it in the auto-reply; say it on the page too.
10. **404 page** says "premium acrylic collections" (retail voice) and "Browse Shop". For a manufacturer, "Browse Products" and "Talk to our team" fit better.

---

## 8. Accessibility

Concrete defects, all cheap to fix:

- **Icon-only buttons without names.** `CartClient.tsx` quantity minus/plus (lines ~200 to 215) and remove (line ~218) have no `aria-label`; remove has only a `title`. Add `aria-label="Decrease quantity"` / `"Increase quantity"` / `"Remove item"`.
- **Nested interactive elements** in product cards (D3).
- **The map iframe has no `title`** (`contact/page.tsx`, line ~300). Screen readers announce an unnamed frame.
- **No skip-to-content link.** With a nine-item nav plus a search button plus a CTA, keyboard users tab through roughly 15 controls on every page.
- **Mobile menu has no focus trap, no Escape handler, no scroll lock, and no `aria-expanded`** (`Header.tsx`, line ~525). Opening it leaves focus behind the overlay.
- **Hover-only affordances.** The IP popover on podium cards opens on hover and on click, which is fine, but the desktop "View Details" overlay is `pointer-events-none` and hover-only, so it never exists for touch or keyboard.
- **`overflow-x: hidden` on `body`** (`globals.css`) masks horizontal overflow instead of fixing it, which is why header crowding (D2) does not show up in testing.
- **Text contrast.** Footer `text-white/50` and `text-white/60` on `#0c1a40` at 12 to 13 px lands near 4.0:1, under the 4.5:1 requirement for small text. Raise to `text-white/75`.
- **Micro type.** `text-[10px]`, `text-[10.5px]`, and `text-[11px]` appear dozens of times (badges, product card eyebrows, IP notice). Below 12 px is not readable for the 40-plus procurement manager who signs the PO. Set a 12 px floor.
- **No `focus-visible` styling** on links. Buttons get `focus:ring` in forms, but header and footer links fall back to the browser default, which is invisible on navy.

---

## 9. Performance and architecture

- **`export const dynamic = "force-dynamic"` on almost every page and on the root layout.** That disables static generation and full-route caching everywhere, so each visit costs a Redis read plus a render even for `/about`. The Redis layer makes this tolerable, but a marketing site should be static with on-demand revalidation. Move to `revalidate` plus `revalidateTag` on admin writes (you already invalidate tags) and keep `force-dynamic` only on `/admin` and personal pages.
- **`images.unoptimized: true`** (`next.config.ts`, line 17). Every product image and the hero are served at full resolution. On a 3G phone in a Tier-2 city that is seconds of LCP. Keep it off only if R2 bandwidth is genuinely the bottleneck; otherwise use `next/image` with a `sizes` attribute and let the optimizer create 640/1080 variants, or pre-generate variants at upload time in the R2 path.
- **`remotePatterns: "**"`** is a footgun the day someone flips `unoptimized` off (see S13).
- **Every string on the page is a client component.** `EditableText` is `"use client"` and wraps headings, labels, and prices, so the majority of public pages hydrate a large JS tree for editing that 99.99 percent of visitors cannot use. Gate the interactive layer on `isAdmin`: render plain server markup by default and mount the editable variant only after `/api/ai/status` confirms an admin. That will cut the public JS bundle substantially.
- **`InlineEditProvider` defaults `editMode` to `true`** before status loads, so admins land on a page covered in pencils and can mis-click. Default to `false` and remember the choice.
- **Analytics buffering is per-process** (`globalThis` map, `setTimeout(10s)`). A deploy every 10 seconds could drop visits; low impact, worth noting alongside the Redis move.
- **SQLite with `instances: 1` and `max_memory_restart: 900M`.** Fine for now, correctly configured for WAL. Two things to document for the next maintainer: the DB is a single file in the project root (one accidental `git add -f` away from the repo), and `ecosystem.config.cjs` rereads `.env` at boot, so a secret rotation needs a process restart.
- **`cpus: 2` and `workerThreads: false`** are sensible VPS choices, but they mean build time scales poorly. Not a problem at this size.

---

## 10. SEO and metadata

- **Two base-URL sources.** `layout.tsx` hard-codes `https://classicconcepts.in` at lines 17, 55, 93, 94, while `robots.ts` and `sitemap.ts` read `NEXT_PUBLIC_APP_URL`. On staging, metadata and canonical URLs will point at production while the sitemap points at staging. Centralise in one constant driven by `NEXT_PUBLIC_SITE_URL`.
- **Title separators are inconsistent**: `|`, `-`, and no separator across pages. Pick `|`.
- **Duplicate H1 risk.** `layout.tsx` metadata title is long ("Classic Concepts | Superior Acrylic Craftsmanship & Podium Manufacturer") but the hero H1 is different again; that is fine, but product and category pages should each own a unique H1 with the product name first.
- **Product structured data** (`src/app/shop/p/[slug]/page.tsx`) emits BreadcrumbList and Product JSON-LD. **[verify]** that `offers` uses the real `discountPrice`, not the struck-through MRP, and that `availability` reflects made-to-order reality. Fake rich results are a manual-action risk.
- **`/cart` is disallowed in `robots.ts`** (good) but `/online-payments` and `/resources` are indexable and mostly boilerplate. Consider `noindex` on `/cart` via metadata too, since `robots.txt` alone does not prevent indexing if linked.
- **No `og:image` per product.** Every share shows `/logo.png`. Dynamic OG images per product would lift WhatsApp and LinkedIn click-through, and this audience shares links in WhatsApp groups constantly.
- **HSTS plus canonical domain:** ensure `www` and non-`www` both resolve and one 301s to the other. The redirect config only covers `/classicedge53`.

---

## 11. Code hygiene and repo

- `README.md` is still the create-next-app boilerplate. Replace with: stack, env vars, how to run, how to seed, how to deploy, where backups live, who owns the admin account. This is the highest-ROI documentation you can write.
- `agents/` holds both YAML agent definitions and `.md` writing rules, while `.agents/rules/` holds a duplicated copy of the same rules. Two sources of truth for the same policy will diverge. Keep one and reference it.
- `changesrequired.md`, `inputs.txt`, `refactor.js`, `refactor-all.js`, `update.sh`, `tsconfig.tsbuildinfo`, `dev.db`, `dev.db-shm`, `dev.db-wal`, `backups/`, `.next/` all sit in the working tree. Confirm `.gitignore` covers each (only `.env` and `dev.db` were verified untracked here). Move the planning docs to `docs/` and delete the two `refactor*.js` scripts if they were one-off codemods.
- `src/app/api/admin/me/route.ts` duplicates `/api/ai/status`. Delete one.
- `src/components/ai/CustomerConciergeModal.tsx` now exports a component that returns `null`. Delete it and the import in `PublicChrome.tsx`.
- Two separate admin-cache status components (`RedisCacheStatusCard`) and AI status endpoints mean two places to update when the model or cache changes. Consolidate.
- The AI system prompt in `src/lib/ai-context.ts` (roughly lines 380 to 470) hard-codes company facts: "16,000 sq. ft.", "ISO 9001:2015", "HYM, Global Accreditation, and ASCB accredited", "5-Year Warranty against yellowing", "exports to the USA, Canada, Mexico...". Facts that live in two places (prompt and page copy) will drift, and the model will confidently repeat a stale claim. Move facts to `SiteSetting` rows the prompt interpolates.

---

## 12. Prioritised plan

**This week (security and legal, roughly 1.5 days):**
1. S1 security headers, CSP in report-only first.
2. S2 contact and checkout throttling, honeypot, MX check, generic validation.
3. S3 generic login error, `session.maxAge = 8h`, Redis-backed login lockout.
4. S5 remove `smtpPass` from settings HTML; S6 remove `includeSecrets`; rotate the Gmail app password and both Anthropic keys.
5. L1 `/privacy` plus a notice line under both forms; L2 `/terms`; fix the cart disclaimer link.
6. L3 replace the default IP claim text and gate the Registered Design badge on real data.
7. Remove the VISA/MasterCard badges and the cash-deposit surcharge line; add the anti-fraud warning (L4).

**Next two weeks (trust, content, design):**
8. C1 strip model names and cache labels from all public surfaces; rewrite the ACRIO self-description.
9. C2 and C3 copy pass: fix the Hero H1 typo, remove "two decades", "market leader", "India's leading", "meticulous", "state-of-the-art", "cutting-edge", and all six public em dashes; fix the two email templates.
10. S4 recompute order totals server side.
11. S7 replace the regex sanitiser with `sanitize-html`.
12. S10 lock down CORS and team PII.
13. D1 unify the palette and radius scale; D4 show a mobile price line; D3 fix nested interactive elements.
14. D2 header restructure to six items plus a mega-menu.
15. A1 accessibility sweep (labels, iframe title, skip link, focus states, 12 px floor, contrast).

**Next month (architecture and growth):**
16. S11 `isActive` plus admin audit log; S12 setup token; TOTP on the admin account.
17. P1 move public pages to `revalidate` plus tags; restore image optimisation with `sizes`; gate inline edit behind admin so public pages hydrate less.
18. Build the podium comparison tool and "Help me choose", plus the `/industries` and `/custom-fabrication` pages your spec already defines.
19. S8 split the upload endpoint and move documents to a private bucket.
20. DPDP housekeeping: retention job, consent columns, grievance officer, erasure runbook.

---

## 13. Suggested additions that were not asked for but are worth it

- **A quotation PDF generator.** Staff answer WhatsApp enquiries manually today. A one-click "Generate quote PDF" from an enquiry, with SKU, quantity, price, validity, and GST, would cut hours per week.
- **Real installation photography.** The strongest trust asset a factory has is a photo of the podium on a stage in a church, a college auditorium, or a hotel. `/podiums` currently leans on product cutouts.
- **A single "Verify our credentials" page** listing ISO certificate numbers, GSTIN, Udyam number, IEC, and design registration numbers, downloadable as PDFs. That one page answers the due-diligence email every institutional buyer sends.
- **Order and enquiry SLA counters in the admin dashboard** ("3 enquiries older than 24h") instead of raw counts. It turns the dashboard into a work queue.

---

## 14. Copy-paste helpers

### Rate limiter (Redis-backed)

```ts
// src/lib/rate-limit.ts
import { redis } from "@/lib/redis-cache"; // reuse your existing ioredis client

export async function rateLimit(key: string, max: number, windowSec: number) {
  const bucket = `rl:${key}:${Math.floor(Date.now() / 1000 / windowSec)}`;
  const count = await redis.incr(bucket);
  if (count === 1) await redis.expire(bucket, windowSec);
  return { ok: count <= max, remaining: Math.max(0, max - count) };
}
```

Call in `/api/contact`:

```ts
const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "anon";
if (!(await rateLimit(`contact:${ip}`, 3, 600)).ok) {
  return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
}
```

### Safer HTML

```ts
import sanitizeHtml from "sanitize-html";

export function sanitizePublicHtml(dirty: string) {
  return sanitizeHtml(dirty, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a", "span"],
    allowedAttributes: { a: ["href", "target", "rel"], span: ["class", "style"] },
    allowedStyles: {
      span: { color: [/^#[0-9a-f]{3,8}$/i], "font-weight": [/^\d{3}$/], "font-size": [/^\d{1,2}(px|rem)$/] },
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }) },
  });
}
```

### Login hardening

```ts
// src/lib/auth.ts
session: { strategy: "jwt", maxAge: 60 * 60 * 8, updateAge: 60 * 60 },
jwt: { maxAge: 60 * 60 * 8 },
// and in authorize(): throw new Error("Email or password is incorrect") on both failure paths
```

---

## 15. What this audit could not verify

- Whether the patent, registered design, ISO, HYM, GA, and ASCB claims are backed by current documents. **[verify with the client]**
- Whether the 27 podium models and 188 products are accurate, and whether "16,000 sq. ft." matches the current facility.
- Whether client logo usage is licensed. **[verify]**
- Whether `X-Forwarded-For` is overwritten by the production proxy. This determines how exploitable S9 actually is.
- Whether the R2 bucket is public-read, listable, or custom-domain fronted, since that shapes S8.
- Actual Lighthouse numbers, real-device rendering, screen-reader behaviour, and any runtime error on `/admin`, because none of those can be established from static reading.
- `npm audit` results. Run `npm audit --omit=dev` before the next deploy; Next 16 and NextAuth 4 both have had patch-level security releases this year.

**Verified and passing:** `npx tsc --noEmit` exits 0. `.env` and `dev.db` are not tracked by git. `requireAdminSession()` guards the admin server actions and API routes sampled. Uploads whitelist extensions and cap at 20 MB. SVG and HTML uploads are correctly rejected. The AI layer degrades gracefully to a local catalog matcher when keys are missing.
