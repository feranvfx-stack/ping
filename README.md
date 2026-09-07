Ping

Ping is a React + Vite real-time messenger with Supabase Auth, Postgres, Realtime, Storage, direct text messaging, voice notes, presence, and WebRTC calls. The app opens directly on the account screen and has no marketing landing page.

## Run locally

```bash
npm install
npm run dev
```

To open the development app on another device connected to the same Wi-Fi network, use the **Network** URL printed by Vite, for example:

```text
http://192.168.1.25:5173
```

Vite is configured to listen on the network. The other device must be on the same network, and your computer firewall must allow port `5173`.

Supabase Auth settings for local network development:

1. Open **Authentication → URL Configuration**.
2. Keep `http://localhost:5173` as the local Site URL, or use your deployed URL as the Site URL.
3. Add the device URL to **Additional Redirect URLs**, replacing the IP with the one printed by Vite:

```text
http://192.168.1.25:5173/**
```

4. Keep the Supabase callback URL in Google Cloud Console unchanged:

```text
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

The app redirects to `${window.location.origin}/app`, so sign-in returns to whichever device opened it.

For a fresh local env file, use:

```bash
cp .env.example .env.local
npm run dev
```

The frontend uses Supabase directly. The legacy Node server is not required for the rebuilt app.

## Production build

```bash
npm run build
```

Upload the generated `dist/` directory to a static host. The included `public/_redirects` supports Netlify-style SPA fallback, while `public/.htaccess` supports Apache/Hostinger. The Socket.IO server still needs a Node-capable host and a persistent data store for production use.

## Deploy on Render

Create a **Static Site** in Render and connect the GitHub repository containing this project.

Use these settings:

```text
Build Command: npm install && npm run build
Publish Directory: dist
```

Add these environment variables in Render under **Environment**:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Do not add the Supabase service-role or secret key to Render environment variables for this frontend.

Add a Render rewrite under **Redirects/Rewrites**:

```text
Source: /*
Destination: /index.html
Action: Rewrite
```

This keeps routes such as `/app` and `/settings` working after a page refresh. After the first deployment, copy the Render URL, for example `https://ping-xxxx.onrender.com`.

In Supabase, open **Authentication → URL Configuration** and set:

```text
Site URL: https://ping-xxxx.onrender.com
Additional Redirect URL: https://ping-xxxx.onrender.com/**
```

Keep the Google provider callback URL as:

```text
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

The app uses the current browser origin for authentication redirects, so the same build works on Render, localhost, and a LAN address.

## Supabase migration foundation

`supabase/schema.sql` contains the profiles, conversations, messages, connect-code tables, trigger, RLS policies, and an atomic `redeem_connect_code` function. Apply it in the Supabase SQL editor, then create a `voice-notes` Storage bucket with authenticated upload access and participant-scoped reads.

The browser must only receive the project URL and anon key:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Never expose a service-role key in Vite environment variables.

### Finding the Supabase values

1. Open [supabase.com](https://supabase.com), create an account, and create a new project.
2. In the project dashboard, open **Project Settings → API**.
3. Copy **Project URL** into `VITE_SUPABASE_URL`.
4. Copy the browser-safe **Publishable key** (or legacy `anon` key) into `VITE_SUPABASE_ANON_KEY`.
5. Never copy the `service_role` or secret key into `.env` or frontend code.

After adding the values, restart Vite. Environment variables are read when the dev server starts.

### Database and storage

1. Open **SQL Editor**, create a new query, paste `supabase/schema.sql`, and run it.
2. Open **Storage → New bucket** and create these buckets:
	- `voice-notes` for voice messages.
	- `avatars` for profile photos.
	- `status-media` for status photos and videos.
3. Enable public access only for initial testing. Before a public launch, replace public URLs with signed URLs and add participant-scoped Storage policies.
4. In **Authentication → URL Configuration**, set the Site URL to the address you are currently using. For phone testing on your Wi-Fi, use `http://192.168.1.157:5173`.
4. Add these URLs under **Additional Redirect URLs**:

```text
http://localhost:5173/**
http://192.168.1.157:5173/**
```

Add your deployed URL there later as well. The phone must open the app using the LAN address, never `localhost`.

## Google OAuth setup

1. In Supabase, open **Authentication → Providers → Google** and enable it.
2. In Google Cloud Console, create an OAuth 2.0 Web Client ID.
3. Set the authorized redirect URI to `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`. Find `YOUR_PROJECT_REF` in the Supabase Project URL.
4. Paste the Google Client ID and Client Secret into the Supabase Google provider form.
5. In **Authentication → URL Configuration**, add both `http://localhost:5173/app` and your deployed `/app` URL as redirect URLs.

## Deployment notes

For Vercel or Netlify, configure environment variables in the project settings and deploy the `dist/` output using the platform's normal build command. For Hostinger, run `npm run build`, upload `dist/` to `public_html`, and configure build-time environment variables. A production deployment should replace the in-memory server maps with Supabase Postgres and Realtime before handling real user data.

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
