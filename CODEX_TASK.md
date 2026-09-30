# PromoPilot — Codex Implementation Task

## Goal
Finish PromoPilot into a launch-ready small-business marketing SaaS without breaking the current Supabase authentication or existing preview/dashboard flows.

Live site: https://promopilot-ai-marketing.vercel.app
Repo: LegalComander/promopilot-ai-marketing

## Important current state
- Frontend is currently static HTML/CSS/JS.
- Supabase authentication is working, including email confirmation and password recovery.
- Supabase project already has `profiles`, `campaigns`, and a `subscriptions` table.
- Paid entitlement data exists in `subscriptions` and should be treated as the source of truth.
- A secure Postgres RPC named `consume_marketing_pack(text,text,text)` has been created to atomically consume a pack and insert a campaign. Use this instead of client-side credit decrement logic.
- Current `app.js` still performs insecure browser-side `profiles.free_credits` updates and must be changed.
- Stripe currently has a TEST MODE PromoPilot subscription product. Do not switch to live Stripe or expose any secret key in client code.
- Current product direction is a low-cost founding subscription. The owner is considering £0.99/month. Keep pricing copy easy to configure and do not assume live price until Stripe live configuration is finalized.

## Priority 1 — Fix paid/free entitlement handling
1. Inspect the current code before modifying it.
2. In `loadSupabaseState()`, also fetch the signed-in user's row from `subscriptions`.
3. Determine active Pro access only when `plan='pro'` and `status` is `active` or `trialing` (and period has not expired if a period end exists).
4. Replace direct browser-side decrement/update of `profiles.free_credits` with the existing `consume_marketing_pack()` Supabase RPC.
5. After generation, reload profile/subscription/campaign state.
6. Dashboard must show:
   - Free user: `FREE PACKS LEFT` + remaining number.
   - Pro user: `PRO PACKS LEFT` + `monthly_limit - packs_used`.
   - Pro badge/plan label when active.
7. When no packs remain, show a clear upgrade message rather than silently failing.
8. Do not allow client-side code to set a user to Pro.

## Priority 2 — Add a useful complete Marketing Pack
For each campaign generate these sections in the results UI:
- Facebook / Instagram post
- Google Business Profile post
- SMS / WhatsApp message
- Review request
- Hashtags / local keywords
- 3 hook/headline variations
- CTA suggestions
- Short promotional email with subject line
- 15–30 second Reel/TikTok script with hook, simple scene plan, voiceover/text, CTA
- Customer reactivation/follow-up message
- 7-day mini posting plan

Keep output concise and practical for local small businesses such as cleaners, valeters, barbers, salons, dog groomers, tradespeople, takeaways, photographers, etc.

## Priority 3 — Add branded image creation without paid AI image APIs
Create a zero/near-zero-cost browser-side branded image generator first.

Requirements:
- Generate a 1080x1080 square social graphic from campaign data using HTML Canvas or SVG.
- Generate a 1080x1920 Story/Reel cover version.
- Use the existing PromoPilot navy/mint/light-blue visual direction.
- Automatically place business name, main offer/headline, location, and a CTA.
- Add `Download image` buttons.
- Keep text inside safe bounds and resize/wrap long offers cleanly.
- Allow user to optionally upload a business logo/photo for the design, but the feature must still work without an upload.
- Do not add paid image-generation APIs in this task.

## Priority 4 — Upgrade UX
- Add an Upgrade card/button for non-Pro users.
- Keep checkout URL/config separate from core logic so test/live links can be changed safely.
- Never put Stripe secret keys in frontend code.
- If a test checkout link is present, clearly label it test mode in development and do not present it as real billing in production.
- Add a small plan summary in the dashboard.

## Priority 5 — Launch-quality cleanup
- Keep mobile responsive.
- Preserve password reset / resend-confirmation behavior.
- Keep marketing consent separate and optional.
- Add friendly loading and error states for auth, pack generation, subscription lookup, and RPC failures.
- Remove misleading copy such as `Upgrade options come after validation` once upgrade UI is present.
- Do not claim image generation is AI if it is template/canvas-based.
- Avoid adding dependencies unless clearly useful.

## Files likely involved
- `index.html`
- `styles.css`
- `app.js`
- `auth-enhancements.js`
- `config.js` / `config.example.js`
- `supabase-schema.sql` only if schema documentation needs syncing; do not destructively recreate production tables.

## Definition of done
- Existing signup/login/password recovery still works.
- Signed-in free account can consume packs securely via RPC.
- Active Pro account reads entitlement from `subscriptions` and gets the correct monthly remaining count.
- Direct browser updates can no longer be used to grant extra credits/Pro status.
- A campaign produces all expanded pack sections.
- Square and Story graphics can be generated and downloaded.
- Dashboard clearly distinguishes Free vs Pro.
- No secrets committed.
- No live Stripe charges enabled as part of this task.
- Changes are kept understandable and minimal, with a short README note explaining the entitlement flow.

## Implementation approach
Please make the changes on a branch and open a pull request rather than pushing a large unreviewed rewrite directly to `main`. Keep the current design language and existing functionality while upgrading it incrementally.
