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

Repeat for `id` parameter (used by multiple events):
1. Click **Create custom dimension**
2. Fill in:
   - **Dimension name**: `id`
   - **Scope**: Event
   - **Event parameter**: `id`
3. Click **Save**

**Events using these parameters:**
- `site_page_viewed` - uses `id` - fires when a user views a site's detail page
- `cta_clicked` - uses `site_id` - fires when a user clicks a CTA button
- `site_visible_on_map` - uses `id` - fires when a site's marker is visible on the map
- `searched` - uses `id` - fires when a site appears in search results

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
    "views": {
      "total": 42,
      "uniqueUsers": 28,
      "previousTotal": 35,
      "previousUniqueUsers": 22,
      "totalChange": 20,
      "uniqueUsersChange": 27
    },
    "ctaClicks": {
      "total": 5,
      "uniqueUsers": 4,
      "previousTotal": 3,
      "previousUniqueUsers": 2,
      "totalChange": 67,
      "uniqueUsersChange": 100
    },
    "mapImpressions": {
      "total": 1250,
      "uniqueUsers": 340,
      "previousTotal": 980,
      "previousUniqueUsers": 290,
      "totalChange": 28,
      "uniqueUsersChange": 17
    },
    "searchImpressions": {
      "total": 89,
      "uniqueUsers": 45,
      "previousTotal": 102,
      "previousUniqueUsers": 51,
      "totalChange": -13,
      "uniqueUsersChange": -12
    }
  },
  "meta": {
    "period": "last_30_days",
    "comparedTo": "previous_30_days"
  }
}
```

Each metric includes:
- `total`: Total event count for the period
- `uniqueUsers`: Number of unique users who triggered the event
- `previousTotal`: Total event count for the previous 30-day period
- `previousUniqueUsers`: Unique users in the previous period
- `totalChange`: Percentage change in total (positive = increase, negative = decrease)
- `uniqueUsersChange`: Percentage change in unique users

### If analytics not configured:
```json
{
  "data": {
    "views": null,
    "ctaClicks": null,
    "mapImpressions": null,
    "searchImpressions": null
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
- The endpoint returns data for the last 30 days (compared against previous 30 days)
- Only site owners can access analytics for their sites
- If `GA4_PROPERTY_ID` is not set, the endpoint returns null values gracefully

---

## Testing Checklist (Post-Release)

**Prerequisites before testing:**
1. App release deployed with analytics events
2. User traffic generating events (or test manually in the app)
3. Wait 24-48 hours for GA4 to process the data

**What was implemented:**

### Mobile App Events (nomad)
Four events are tracked and sent to Firebase Analytics:

| Event | Location | Trigger | Parameters |
|-------|----------|---------|------------|
| `site_page_viewed` | `SiteContent.tsx` | User opens a site's detail page | `id`, `title` |
| `cta_clicked` | Custom CTA button | User taps the CTA button on a business listing | `site_id`, `cta_type`, `cta_value` |
| `site_visible_on_map` | `MapView.tsx:270` | Site marker appears on the map (fires each time markers load/refresh) | `id`, `title` |
| `searched` | `searchResults.tsx:85` | Site appears in search results | `id`, `position`, `type`/`resource` |

### API Endpoint (nomad-api)
`GET /api/sites/:id/analytics` - Returns analytics for site owners

### Mobile UI (nomad)
`OwnerAnalytics.tsx` - Displays in business account section (`SitesContent.tsx`)

Shows for each metric:
- Total count (all events)
- Unique users (distinct users who triggered the event)
- Percentage change vs previous 30 days (green up arrow / red down arrow)

**Testing steps:**

1. **Verify GA4 custom dimensions exist:**
   - Go to Google Analytics → Admin → Custom definitions
   - Confirm `id` and `site_id` dimensions are registered

2. **Verify events are flowing (before 48hr wait):**
   - Firebase Console → Analytics → DebugView
   - Open the app and trigger events (view a site, search, etc.)
   - Events should appear in real-time in DebugView

3. **Test API endpoint (after 48hr wait):**
   ```bash
   # Get a valid JWT token, then:
   curl -H "Authorization: Bearer <token>" \
        https://nomadapp-api.herokuapp.com/api/sites/<owned_site_id>/analytics
   ```

   Expected: Response with non-zero values for metrics that have data

4. **Test mobile UI:**
   - Log in as a business owner
   - Go to Account → Business tab
   - Scroll to owned site
   - Verify "Your listing stats" section shows:
     - Basic stats (Likes, Rating, Reviews) - always visible
     - "Last 30 days" section with analytics cards (if data exists)
     - Each card shows total, users, and % change

5. **Edge cases to verify:**
   - New site with no data → Should show 0s or not render analytics section
   - Site with data only in current period → Should show 100% increase
   - Site with decreasing traffic → Should show negative % in red

**If data isn't appearing after 48 hours:**
1. Check Firebase DebugView to confirm events are being sent
2. Check GA4 → Reports → Realtime to see if events are arriving
3. Check GA4 → Admin → Custom definitions to ensure dimensions are registered
4. Check API logs: `heroku logs --tail -a nomadapp-api | grep -i analytics`
