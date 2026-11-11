# CRYPTO GATE — private crypto practice simulator

A responsive, invitation-only, virtual-money crypto trading simulator for a private group of up to 101 accounts (you as admin plus 100 friends). It includes email/password sign-in, invitation-code-only registration, a 3 USDT practice wallet per new user, simulated buy/sell orders, holdings, trade history, and an admin user overview.

**Important:** This is an educational paper-trading app, not a real exchange. Prices are illustrative demo values and currently do not come from a live market feed. The practice-trade RPC accepts the displayed price from the browser, which is acceptable only for a no-value simulator. Never adapt this code for real-money trading or custody.

## 1. What you need

Create accounts that you control:
- Supabase: https://supabase.com
- Vercel: https://vercel.com
- GitHub: https://github.com (recommended for deployment)

## 2. Configure Supabase

1. Create a new Supabase project.
2. Open **SQL Editor** in the Supabase dashboard.
3. Paste the entire contents of `database.sql` and run it.
4. In SQL Editor, run `select code from public.invite_codes where is_admin_invite = true and used_by is null;` and privately copy the returned one-time owner code. This is needed for your first signup.
5. Open **Project Settings → API** (or API Keys).
6. Copy the Project URL and the public anon/publishable key. Never use the `service_role` key in browser code.
7. In Supabase **Authentication → URL Configuration**, set the Site URL to your eventual Vercel URL. Add that URL to Redirect URLs too.
8. For smoother testing you may temporarily disable email confirmation in Authentication settings. For your private group, keep email confirmation enabled if you have email delivery configured; otherwise you can temporarily disable it while testing.

## 3. Run locally

Install Node.js (LTS), then in this project folder:

```bash
npm install
```

Copy `.env.example` to `.env` and fill in your Supabase URL and public anon/publishable key:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
```

Then:

```bash
npm run dev
```

Vite prints a local development URL. Open it in your browser.

## 4. Private invitations and admin access

1. Create your account first using the one-time owner code from the SQL query above. The database automatically assigns this first account the `admin` role.
2. Sign in. In the Admin control room, select **Create friend invitation**.
3. Send each friend a different code. Each code works once. Friends must enter a valid invitation code to register.
4. The database blocks signups without a code and enforces a maximum of 101 total accounts (you plus 100 friends).
5. Use **Load invitations** and **Load user overview** to monitor access. Keep your owner code private and never share your admin login.

The initial owner code is generated when the SQL is first run; retrieve it with the query in Step 4 above. If you already created an account before installing this private version, assign its profile role to `admin` in Supabase and create an invitation code through SQL or use the new admin panel after updating.

## 5. Host the private app with Vercel

1. Push this project folder to a private or public GitHub repository that you control.
2. In Vercel, choose **Add New → Project**, import your repository.
3. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`.
4. Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel Project Settings.
5. Deploy. Vercel will give you a URL that is technically reachable on the internet, but only invited users can create accounts or sign in.
6. Add that URL to Supabase Authentication → URL Configuration (Site URL and Redirect URLs).
7. Test registration, sign-in, buying, selling, and admin access in a second browser/account.

You own the GitHub repository, Supabase project, and Vercel project when you create them under your own accounts. Keep their recovery email and MFA under your control.

## 6. Current limitations

- Prices and chart are sample/demo values. Add a trusted market-data provider before presenting this as a live-market practice environment.
- This starter supports simulated spot buy/sell only. It does not implement futures, leverage, liquidation, stop-loss, or take-profit.
- The app currently has no password reset UI, profile editing, user suspension, or admin balance-adjustment UI.
- Add rate limiting, abuse monitoring, backup policy, privacy policy, terms, and support contact before promoting publicly.
- Use a custom domain only after you own/register it and configure DNS.
- Supabase public anon key is designed to be exposed in the frontend; the service-role key is secret and must never be added to `.env` variables prefixed with `VITE_`.

## 7. Safety model

Every invited new account receives a separate 3 USDT virtual wallet. Signup is blocked without a valid one-use invite code; the database enforces a maximum of 101 profiles. Database policies restrict user reads to their own data, while admin overview is guarded by a database role check. Trades are stored in the database and update the virtual wallet and holdings in one database transaction. No payment, deposit, withdrawal, wallet connection, or blockchain transaction exists in this project.
