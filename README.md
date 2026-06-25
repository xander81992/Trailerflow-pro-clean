# TrailerFlow Pro Clean

Modern internal intercompany trailer movement and yard management portal for Hopewell / RNF.

## What is included

- Modern landing page
- Admin Control Center
- RNF dashboard
- RNF trailer location visibility
- RNF pickup booking
- RNF empty trailer requests
- RNF auto approval logic
- Shunter assigned tasks only
- Start / Arrived / Picked Up / Dropped / Completed timestamps
- Warehouse master setup
- Door master setup
- Trailer master setup
- One door = one trailer rule
- Users and invitation link demo
- Excel-ready CSV exports
- Print / Save as PDF report option
- Firebase-ready config file

## Deploy on Vercel

Use these settings:

- Framework Preset: **Next.js**
- Root Directory: **./**
- Build Command: **npm run build**
- Output Directory: leave blank / default

Do not select Vite for this version.

## GitHub upload

Upload the contents of this folder directly to the root of your repository.

Your GitHub repository should show:

```text
app/
components/
lib/
public/
package.json
next.config.js
tailwind.config.js
postcss.config.js
README.md
```

It should NOT be inside another folder like:

```text
trailerflow-pro-clean/trailerflow-pro-clean/package.json
```

## Firebase environment variables

Add these later in Vercel under Project Settings > Environment Variables:

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

The current app works as a clean local/demo version using browser storage. The Firebase file is ready for the next build phase.

## Demo roles

From the landing page, use:

- Admin Demo
- RNF Login
- Shunter Login

## Important

This is the clean modern foundation. It is structured correctly for GitHub + Vercel and designed to grow into the full Firebase production app.
