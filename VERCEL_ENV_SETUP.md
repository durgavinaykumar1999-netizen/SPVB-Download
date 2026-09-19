# Vercel Environment Variables Setup

## ⚠️ IMPORTANT - Why Live TV Button is Not Showing in Production

The `.env` file is ignored by git (correct for security), but Vercel needs the API URL to be set via environment variables.

## ✅ What to Do in Vercel Dashboard

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add the following variable:

```
Name: REACT_APP_API_URL
Value: https://spvbdownloadgames.dpdns.org
Environments: Production, Preview, Development
```

## Why This Fixes the Issue

- **Local development (.env file):** Uses `http://localhost:1406`
- **Production (Vercel):** Must use `https://spvbdownloadgames.dpdns.org`
- Without this, the frontend cannot connect to backend → Live TV button doesn't render
- All API calls (movies, games, live TV, etc.) depend on this URL

## Current Status

✅ Code is correct - Live TV button is in App.tsx line 603  
✅ Import path is correct - `./components/LiveTV`  
✅ Routing is correct - `/livetv` and `/livetv/:channel-name`  
❌ **Missing:** Environment variable in Vercel dashboard

## Step-by-Step Fix

1. Open https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** (tab)
4. Click **Environment Variables** (left sidebar)
5. Click **Add New**
   - Name: `REACT_APP_API_URL`
   - Value: `https://spvbdownloadgames.dpdns.org`
   - Select all environments
   - Click **Save**
6. Click **Redeploy** (Project → Deployments → Latest → three dots → Redeploy)

## Result

After redeployment:
- 📺 Live TV button will appear in navigation
- Live TV channels will load and play
- Mobile UI will work properly
- All features will work in production

## For Local Testing

Local `.env` already has `http://localhost:1406` which is correct for local development.
