# Firebase Analytics Integration Setup

This document outlines the steps to complete the Google Analytics Data API integration for the Owner Dashboard analytics feature.

## Overview

The mobile app tracks `site_page_viewed` and `cta_clicked` events via Firebase Analytics. The API endpoint `/sites/:id/analytics` queries these events from Google Analytics to display view counts and CTA click counts to business owners.

---

## Prerequisites

- Firebase project with Analytics enabled
- Access to Google Cloud Console (same project)
- Access to Google Analytics
- Heroku CLI installed

---

## Step 1: Enable Google Analytics Data API

1. Go to: https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com
2. Ensure you're in the correct project (same one linked to Firebase - check dropdown at top)
3. Click **"Enable"**

---

## Step 2: Find Your GA4 Property ID

### Option A: Via Firebase Console (Recommended)
1. Go to: https://console.firebase.google.com/
2. Select your project
3. Click **Analytics** in the left sidebar
4. Click **"View more in Google Analytics"** link
5. Once in GA4, click the **gear icon** (Admin) → **Property Settings**
6. Copy the **Property ID** (numeric, e.g., `123456789`)

### Option B: Via Firebase Project Settings
1. Firebase Console → **Project Settings** (gear icon)
2. Click **Integrations** tab
3. Find **Google Analytics** section - the Property ID is shown there

### Option C: Direct in Google Analytics
1. Go to: https://analytics.google.com/
2. Click **gear icon** (Admin) in bottom left
3. In Property column, click **Property Settings**
4. Copy the **Property ID** at the top

---

## Step 3: Grant Service Account Access to GA4

### Find your service account email:
1. Open your Firebase/Google credentials JSON file
2. Find the `client_email` field
3. It looks like: `firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com`

### Grant access in Google Analytics:
1. Go to: https://analytics.google.com/
2. Click **gear icon** (Admin) in bottom left
3. In Property column, click **Property Access Management**
4. Click the **blue "+" button** in top right
5. Click **"Add users"**
6. Paste the service account email
7. Set role to **"Viewer"**
8. Click **"Add"**

---

## Step 4: Register Custom Dimensions in GA4

The API queries by `site_id` parameter, which must be registered as a custom dimension:

1. Go to: https://analytics.google.com/
2. Click **gear icon** (Admin) → **Custom definitions** (under Property)
3. Click **Create custom dimension**
4. Fill in:
   - **Dimension name**: `site_id`
   - **Scope**: Event
   - **Event parameter**: `site_id`
5. Click **Save**

Repeat for `id` parameter (used by `site_page_viewed` event):
1. Click **Create custom dimension**
2. Fill in:
   - **Dimension name**: `id`
   - **Scope**: Event
   - **Event parameter**: `id`
3. Click **Save**

**Note:** Custom dimensions can take 24-48 hours to start collecting data after creation.

---

## Step 5: Set Environment Variable on Heroku

```bash
heroku config:set GA4_PROPERTY_ID=YOUR_PROPERTY_ID -a nomadapp-api
```

Replace `YOUR_PROPERTY_ID` with the numeric ID from Step 2.

---

## Step 6: Verify the Integration

### Test the API endpoint:
```bash
# Get a valid auth token first, then:
curl -H "Authorization: Bearer <token>" \
     https://nomadapp-api.herokuapp.com/api/sites/<site_id>/analytics
```

Expected response:
```json
{
  "data": {
    "viewCount": 42,
    "ctaClickCount": 5
  },
  "meta": {
    "period": "last_30_days"
  }
}
```

### If analytics not configured:
```json
{
  "data": {
    "viewCount": null,
    "ctaClickCount": null
  },
  "meta": {
    "error": "Analytics not configured"
  }
}
```

---

## Troubleshooting

### "Analytics not configured" error
- Check `GA4_PROPERTY_ID` is set: `heroku config -a nomadapp-api`

### "Failed to fetch analytics" error
- Verify Google Analytics Data API is enabled in Cloud Console
- Verify service account has Viewer access in GA4
- Check Heroku logs: `heroku logs --tail -a nomadapp-api`

### Data shows 0 for everything
- Analytics data has 24-48 hour delay from Firebase
- Verify events are being logged in Firebase DebugView
- Check the event names match: `site_page_viewed` and `cta_clicked`

---

## Notes

- Analytics data has a 24-48 hour delay from when events are logged
- The endpoint returns data for the last 30 days
- Only site owners can access analytics for their sites
- If `GA4_PROPERTY_ID` is not set, the endpoint returns null values gracefully
