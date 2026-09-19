# PromoPilot — AI Marketing Assistant

Small-business AI marketing SaaS prototype.

## Current features
- Free marketing-pack preview before signup
- Email/password registration UI
- Business profile dashboard
- 3 free campaign generations per account
- Facebook/Instagram, Google Business, SMS/WhatsApp, review-request and hashtag output
- Recent campaign history
- Optional marketing-consent field
- Responsive design
- Supabase-ready real authentication and database support
- Local demo fallback when Supabase is not configured

## Turn on real customer accounts

1. Create/connect a Supabase project.
2. Open the Supabase SQL Editor and run `supabase-schema.sql` once.
3. In Supabase Project Settings, copy the Project URL and anon/publishable key.
4. Put them into `config.js`:

```js
window.PROMOPILOT_SUPABASE = {
  url: 'https://YOUR_PROJECT_REF.supabase.co',
  anonKey: 'YOUR_SUPABASE_ANON_KEY'
};
```

5. Deploy/redeploy the site.

When those two values are present, PromoPilot automatically switches from local demo storage to Supabase authentication and database storage. The page status badge changes to `Live account database connected`.

## Security model
- `profiles` and `campaigns` use Row Level Security.
- A signed-in user can only read/update their own profile.
- A signed-in user can only read/insert/delete their own campaigns.
- Never place a Supabase service-role key in browser code. Only the anon/publishable browser key belongs in `config.js`.

## Database tables

### profiles
Stores account/business details, marketing consent, and remaining free credits.

### campaigns
Stores the user's campaign requests and creation history.

## Next product steps
1. Activate Supabase and test a real signup.
2. Deploy to Vercel.
3. Add account deletion/privacy controls.
4. Replace template generation with a real AI API.
5. Add Stripe subscriptions after validating usage.
