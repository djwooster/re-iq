---
title: Security & data
description: How RE-IQ protects your properties' data, who can see what, and what we're still building.
---

## Overview

- Each customer's data is kept separate from every other customer's, and automated tests check this every time we change the product.
- Your data is encrypted while it travels and while it's stored, in the United States.
- People only see what their role allows. Property managers you invite can upload reports, but never see your dashboards.
- We describe only what's actually in place. Anything still being built is listed under "On our roadmap".

## How your data is protected

### Kept separate

- Every record belongs to one organization, and the database itself refuses to show it to anyone outside that organization.
- On every change we make, automated tests try to read and change another organization's data, and check that they can't.

### Encrypted and stored in the US

- Every connection uses HTTPS, and browsers are told to always use it.
- Stored data is encrypted.
- Your data is stored in the United States (Oregon).

### Error reports without personal data

- When something breaks, we're alerted so we can fix it.
- Before an error report leaves the app, email addresses are removed and people appear only as an anonymous ID. IP addresses aren't stored.

## Accounts and roles

### Three roles

- **Owner**: manages the organization and invites people.
- **Member**: sees the organization's dashboards and reports.
- **Uploader**: a property manager who sends monthly reports. Uploaders join only by invitation, belong to one organization, and can't see your dashboards.

### Invitations

- Each invite works only for the email address it was sent to.
- It expires after 7 days and works once.
- An owner can cancel a pending invite at any time.

## Sign-in

- Sign in with your email and password, or with Google or Microsoft. Property managers sign in with email and password only.
- New accounts must confirm their email address before they can sign in.
- Passwords need at least 8 characters, and passwords known from data breaches are refused.
- Repeated sign-in attempts are slowed down to stop password guessing.
- Sign-in errors never reveal whether an account exists.

## Uploads and files

- Owners choose which properties each property manager can upload to, and can change or remove that access at any time, effective immediately.
- Accepted files: Excel (.xlsx, .xls), CSV, PDF and photos (.jpg, .png, .heic), up to 25 MB each.
- Every file's contents are checked, not just its name. A file that isn't what its name says is refused, and spreadsheets containing macros are refused.
- Location and camera details are removed from photos before they're stored.
- Uploaded files are private: only our servers can read them, never the public. Downloads use links that expire within a minute.
- Uploading the same file again for the same property and month saves a new version instead of replacing the old one.
- Original files are kept privately and deleted 90 days after a customer cancels, or right away when an organization's only owner deletes their account.

## Data we don't keep

- **Benchmarks**: we never pool customers' private rent or occupancy data into shared benchmarks.

> **Not yet live.** These apply once reports are processed automatically, which is still being built:

- **Payroll**: we'll keep payroll totals only, never what an individual is paid.
- **Residents and bank details**: resident names and bank account numbers will be removed when reports are processed.

## Where your data lives

These companies help us run RE-IQ and process data on our behalf. Each one handles only what its job needs.

| Company | What it does for us | Where |
|---|---|---|
| Vercel | Hosts the website and the app | United States |
| Supabase | Database, sign-in and file storage | United States (Oregon) |
| Sentry | Error monitoring, with personal data removed and IP addresses not stored | United States |
| Resend | Sign-in and account emails | United States |
| Google | Sign-in with Google, only if you choose it | United States and other countries |
| Microsoft | Sign-in with Microsoft, only if you choose it | United States and other countries |

## On our roadmap

> **Not yet live.** We'll move each item into the sections above only once it's done.

- Multi-factor sign-in.
- AI providers that don't train on customer data.
- An independent security review.
- SOC 2.

## Reporting a security issue

- If you think you've found a security problem, email {{SECURITY_EMAIL}} with the details.
- Please don't test against other customers' data or share the issue publicly until we've fixed it.
- We'll acknowledge your report and keep you updated.
