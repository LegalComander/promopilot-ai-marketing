# PromoPilot — AI Marketing Assistant

Validation prototype for a small-business marketing SaaS.

## Included
- Free marketing-pack preview before signup
- Prototype business account registration
- Business profile dashboard
- 3 free campaign generations per account
- Facebook/Instagram, Google Business, SMS/WhatsApp, review-request and hashtag output
- Recent campaign history
- Copy buttons and responsive layout

## Important limitation
This build stores account data in browser `localStorage`. It is suitable for product validation and UI testing, but **not** for real customer accounts or central lead collection.

Next production step: replace localStorage with hosted authentication/database, add privacy/account deletion controls, then connect a real AI generation API and Stripe.

## Run
Open `index.html`, or deploy the repository as a static site on Vercel.
