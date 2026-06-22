# PWA, Push Notifications, Profile Photos, and Android APK Setup

## 1. Run Supabase SQL update

Run this file in Supabase SQL Editor:

```txt
docs/SUPABASE_PWA_PUSH_PROFILE_UPDATE.sql
```

It creates:

- `push_subscriptions` table
- `profile-pictures` storage bucket
- secure RPC function `update_my_profile_photo`

## 2. Generate VAPID keys

On your computer with Node.js installed, run:

```bash
npx web-push generate-vapid-keys
```

You will get:

```txt
Public Key:  ...
Private Key: ...
```

## 3. Add VAPID public key to the app

Edit:

```txt
assets/js/supabase-config.js
```

Paste the public key:

```js
window.GWF_PUSH_CONFIG = {
  vapidPublicKey: "YOUR_PUBLIC_KEY_HERE"
};
```

## 4. Deploy Supabase Edge Function

Install Supabase CLI, then from the project folder run:

```bash
supabase login
supabase link --project-ref zfmxpecykhlgbozkpbsr
supabase functions deploy send-push
```

## 5. Set Edge Function secrets

Use your generated keys:

```bash
supabase secrets set VAPID_PUBLIC_KEY="YOUR_PUBLIC_KEY"
supabase secrets set VAPID_PRIVATE_KEY="YOUR_PRIVATE_KEY"
supabase secrets set VAPID_SUBJECT="mailto:gilbertcansah@gmail.com"
```

Supabase automatically provides:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

If not, add them manually from Supabase project settings.

## 6. Redeploy to Vercel

After adding the public VAPID key, redeploy the app.

## 7. Enable notifications

Login as admin/member and click the bell icon in the top bar.

The browser will ask permission. Click Allow.

## 8. Test push events

- Member sends message -> admins with notifications enabled receive push.
- Admin replies -> member receives push.
- Admin posts announcement -> members receive push.

## 9. Android APK packaging with PWABuilder

1. Deploy the updated app to Vercel.
2. Go to https://www.pwabuilder.com
3. Enter your Vercel URL.
4. Click Start.
5. Confirm manifest/service worker pass checks.
6. Click Package for Stores.
7. Choose Android.
8. Download APK/AAB.

## Notes

- Push works best on Android Chrome and installed PWAs/TWA APKs.
- iOS push works only under Apple's PWA notification rules.
- Users must click the bell and allow notifications per device.
