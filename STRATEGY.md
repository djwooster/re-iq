# Strategy: building RE-IQ to be acquirable

The target is a company a strategic buyer or PE firm would pay $500M+ for: roughly $100M ARR,
growing, profitable, and predictable. Buyers pay the top multiples for recurring software
revenue that grows on its own, from many customers, with clean operations. This file turns
that into decisions for RE-IQ. The parts that live in code are repeated as rules in
`CLAUDE.md`.

## The scorecard buyers will use

| Metric | Target | What it proves |
| --- | --- | --- |
| Rule of 40 (growth % + EBITDA margin %) | ≥ 40 | Growth isn't bought at any price |
| Software share of revenue | ≥ 85% (services ≤ 15%) | It's a software company, not consulting |
| Net revenue retention (NRR) | ≥ 110% | Existing customers grow without new sales |
| Gross revenue retention (GRR) | ≥ 90% | Customers don't leave |
| CAC payback | < 12 months | Growth is efficient |
| Largest customer | ≤ 5–10% of revenue | No single logo can sink the company |

Rough shape of $100M ARR: about 500 customers averaging $200K, or 1,000 averaging $100K.
Either way, no one customer is close to 10%.

## 1. Revenue: pure subscription, priced so it grows with the customer

- **Annual or multi-year subscriptions, auto-renewing.** No perpetual licenses, no lifetime deals,
  no billing per use without a committed minimum.
- **Price on units under management, committed annually with a platform minimum.** Multifamily
  owners already think in units. Their portfolios grow through acquisitions, so revenue grows
  with them. That expansion is built into NRR, with no upsell motion needed. Contracts commit
  to a unit count, with a true-up at renewal.
- **A standard price book.** One list of plans, prices, and discount limits. No custom-priced
  "snowflake" contracts, even for design partners. Early-customer discounts are time-boxed and
  written as standard discount lines, never as different terms.

## 2. Expansion paths, designed into the product (the NRR engine)

Every account should have three ways to grow, each tied to something the product already does:

1. **Units.** More properties uploaded or connected means more units billed.
2. **Seats by role.** The app already separates Asset Manager, Owner / Investor, and Executive
   views. Investor and executive seats are a natural add-on: the owner's LPs and leadership
   read the same numbers.
3. **Modules.** Planned capabilities sold as add-ons rather than given away in the base plan:
   PMS connectors, the "Ask" interface, investor reporting, and Phase 2 write-back with approvals.

What goes in which tier is still undecided, and so are the prices. Both are DJ's call, and
they belong in one config file (`lib/billing/plans.ts` once billing exists), never scattered
through the UI.

## 3. Self-serve onboarding keeps services under 15%

The biggest threat to the software share of revenue is onboarding work done by people: mapping
charts of accounts, cleaning exports, building custom reports. RE-IQ's onboarding is the upload
and mapping flow. If a customer can't get from signup to a first insight on their own, the
company drifts into consulting.

- **Measure time to first insight** for every new workspace. The usability sessions on the
  `testing` branch exist to shrink it.
- **Fix parsing problems once, for everyone.** A new export format becomes a template that
  every customer benefits from, never a one-off fix for a single account.
- **Paid services** (white-glove onboarding, historical backfill) are standard SKUs with fixed
  prices, tracked separately from software revenue.

## 4. No concentration: in customers or in people

- **Customers.** Sell to many mid-market owners and asset managers, roughly 2,000–30,000 units
  each. One large operator should never control the roadmap. Their requests go through the same
  product decisions as everyone else's.
- **Code.** No customer-specific branches, forks, or hard-coded org IDs. A customer that needs
  something different gets it through plan entitlements or org settings available to every
  customer.
- **People.** Write down how things work: README, HANDOFF, this file, runbooks. Hire heads of
  product, sales, and engineering early enough that the company runs for a month without the
  founder.

## 5. Operational and legal hygiene, from day one

- **IP.** Every employee, contractor, and agency signs a PIIA (Proprietary Information and Inventions Assignment)
  before touching the code. The company owns 100% of the source. Track open-source licenses.
- **Security.** Multi-tenant isolation by `org_id` (already in every record), Supabase row-level
  security, audit logs for anything that changes data, SOC 2 readiness before enterprise
  deals require it. Resident data stays lease-level only.
- **Billing.** One billing system (Stripe, for example) as the source of truth for ARR,
  so the numbers are auditable in diligence without spreadsheet reconstruction.
- **Metrics from the start.** Track ARR, NRR, GRR, logo churn, CAC payback, and time to first
  insight monthly from the first paying customer. Buyers will ask for the history.

## What this changes now

- Usability testing focuses on self-serve onboarding: signup → first T12 → first insight.
- Before charging anyone: decide the price book (unit price, platform minimum, tiers, modules)
  and model features as entitlements so a plan change never needs a code change.
- Design partners get standard contracts with a time-boxed discount, not special terms.
