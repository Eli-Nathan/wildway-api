# Push Notifications Debug Summary

## Current Status
Push notifications are failing with a 401 authentication error from FCM (Firebase Cloud Messaging), despite credentials appearing to be correctly configured.

## The Error
```
FCM error[errorInfo]: Request is missing required authentication credential. Expected OAuth 2 access token, login cookie or other valid authentication credential.
```

## What's Working
- Firebase Admin SDK initializes successfully
- Messaging instance is created (`[DEFAULT]` app)
- Service account credentials parse correctly:
  - Project ID: `camper-321420`
  - Client email: `firebase-adminsdk-sbpfx@camper-321420.iam.gserviceaccount.com`
  - Token URI: `https://oauth2.googleapis.com/token`
  - Private key format is valid (has BEGIN/END markers, contains newlines)
- OAuth2 access tokens CAN be obtained (verified with google-auth-library)
- In-app notifications work (stored in database, displayed in app)
- Email notifications work

## What's NOT Working
- FCM API rejects all requests with 401, even with valid OAuth2 tokens
- Both Firebase Admin SDK and direct HTTP approaches fail
- Firebase Console test messages also don't deliver (suggests iOS/APNs config issue too)

---

## What We've Tried

### 1. iOS Native Setup (AppDelegate.swift)
**File:** `/Users/eli.nathan/repos/nomad/ios/Wildway/AppDelegate.swift`

Added critical push notification delegate methods that were missing:
- `UNUserNotificationCenterDelegate` and `MessagingDelegate` protocols
- `application.registerForRemoteNotifications()` call
- `didRegisterForRemoteNotificationsWithDeviceToken` to pass APNs token to Firebase
- UNUserNotificationCenter delegate methods for foreground notifications
- MessagingDelegate for FCM token updates

**Status:** Changes made, needs iOS rebuild to take effect.

### 2. Firebase Admin SDK Approach
**File:** `/Users/eli.nathan/repos/nomad-api/src/nomad/notifications/notificationService.ts`

```typescript
import { getMessaging } from "firebase-admin/messaging";

const response = await getMessaging().send(message);
```

**Result:** 401 error - "Request is missing required authentication credential"

### 3. Direct HTTP to FCM v1 API with google-auth-library
```typescript
import { GoogleAuth } from "google-auth-library";

const auth = new GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
});
const token = await client.getAccessToken();
// Then POST to https://fcm.googleapis.com/v1/projects/{project}/messages:send
```

**Result:** OAuth2 token obtained successfully, but FCM API still returns 401.

### 4. Tried Different OAuth Scopes
- `https://www.googleapis.com/auth/firebase.messaging`
- `https://www.googleapis.com/auth/cloud-platform`

**Result:** Both scopes allow token generation, but FCM still rejects.

### 5. Legacy FCM API (Deprecated)
```typescript
const fcmUrl = 'https://fcm.googleapis.com/fcm/send';
headers: { 'Authorization': `key=${serverKey}` }
```

**Result:** Returns HTML (API is deprecated/blocked).

### 6. Updated firebase-admin Package
Updated from `^12.7.0` to `^13.6.1`

**Result:** Same 401 error.

### 7. Verified Service Account Permissions
The service account has these roles (user confirmed):
- Firebase Admin
- Firebase Admin SDK Administrator Service Agent
- Firebase Cloud Messaging Admin
- Firebase Notifications Admin

### 8. Verified APIs Enabled
- Firebase Cloud Messaging API (fcm.googleapis.com) - **Enabled**

---

## Current Code State (Needs Cleanup)

### Files Modified with Debug Logging

#### `/Users/eli.nathan/repos/nomad-api/src/index.ts`
Contains extensive Firebase initialization logging:
```typescript
console.log("[Firebase] Project ID:", serviceAccount.project_id);
console.log("[Firebase] Client email:", serviceAccount.client_email);
console.log("[Firebase] Client ID:", serviceAccount.client_id);
console.log("[Firebase] Token URI:", serviceAccount.token_uri);
// ... etc
```

**Cleanup needed:** Remove verbose credential logging (security risk in production).

#### `/Users/eli.nathan/repos/nomad-api/src/nomad/notifications/notificationService.ts`
Contains extensive FCM debug logging:
```typescript
strapi.log.info(`Full FCM token: ${fcmToken}`);  // REMOVE - logs sensitive token
strapi.log.info(`Message payload: ${JSON.stringify(message)}`);
// ... extensive error property logging
```

**Cleanup needed:** Remove verbose logging, keep only essential error info.

#### `/Users/eli.nathan/repos/nomad-api/src/api/auth-user/routes/auth-user.ts`
Contains test endpoint:
```typescript
{
  method: "POST",
  path: "/auth-users/me/test-push",
  handler: "auth-user.testPushNotification",
  ...
}
```

**Cleanup needed:** Remove test-push endpoint before production.

#### `/Users/eli.nathan/repos/nomad-api/src/api/auth-user/controllers/auth-user.ts`
Contains `testPushNotification` handler.

**Cleanup needed:** Remove test handler.

---

## Environment Variables on Heroku

| Variable | Purpose | Notes |
|----------|---------|-------|
| `GOOGLE_CREDENTIALS` | Firebase Admin SDK service account JSON | Currently set, may need regeneration |
| `FCM_SERVER_KEY` | Legacy FCM key | **Removed** (was for deprecated API) |

---

## Next Steps to Try

### 1. Regenerate Service Account Key (CAREFUL - See Risks Below)
1. Go to Google Cloud Console → IAM & Admin → Service Accounts
2. Find `firebase-adminsdk-sbpfx@camper-321420.iam.gserviceaccount.com`
3. Create a NEW key (don't delete old one yet)
4. Update `GOOGLE_CREDENTIALS` on Heroku with the new key
5. Test push notifications
6. If working, delete old key

### 2. Verify IAM Credentials API is Enabled
Check: https://console.cloud.google.com/apis/api/iamcredentials.googleapis.com?project=camper-321420

### 3. Check Service Account Token Creator Role
The service account might need the "Service Account Token Creator" role to generate OAuth tokens for itself.

### 4. Test from Firebase Console
Try sending a test message from Firebase Console → Cloud Messaging → Send test message
- If this also fails, the issue is definitely iOS/APNs configuration
- If this works but API fails, the issue is service account permissions

### 5. Verify APNs Configuration
In Firebase Console → Project Settings → Cloud Messaging:
- APNs Authentication Key should be uploaded
- Team ID should be correct
- Bundle ID should match (`app.wildway`)

---

## Risks of Regenerating Keys

### GOOGLE_CREDENTIALS (Firebase Admin SDK Service Account)

**Used by:**
1. **Firebase Authentication** - User login/signup verification
   - Impact: If key is invalid, users can't authenticate
   - Mitigation: Test auth flow immediately after key change

2. **Push Notifications** - FCM (currently broken anyway)

3. **Potentially other Firebase services** - Check codebase for other firebase-admin usage

**NOT used by:**
- Google Maps - Uses separate API key (check `GOOGLE_MAPS_API_KEY` or similar)
- Client-side Firebase Auth - Uses `GoogleService-Info.plist` / `google-services.json`

### Safe Regeneration Process
1. Create NEW key without deleting old one
2. Deploy with new key
3. Verify Firebase Auth still works (test login)
4. Verify other Firebase features work
5. Only then delete old key

---

## Files to Review

### Backend (nomad-api)
- `src/index.ts` - Firebase initialization
- `src/nomad/notifications/notificationService.ts` - Push notification sending
- `src/api/auth-user/controllers/auth-user.ts` - Test endpoint to remove
- `src/api/auth-user/routes/auth-user.ts` - Test route to remove

### iOS (nomad)
- `ios/Wildway/AppDelegate.swift` - Push notification delegates (recently modified)
- `ios/Wildway/GoogleService-Info.plist` - Firebase config
- `ios/Wildway/Wildway.entitlements` - Push notification entitlements

---

## Verified Configuration

### GoogleService-Info.plist Values
- GCM_SENDER_ID: `4468850519`
- BUNDLE_ID: `app.wildway`
- PROJECT_ID: `camper-321420`

### Service Account
- Email: `firebase-adminsdk-sbpfx@camper-321420.iam.gserviceaccount.com`
- Project ID: `camper-321420` (matches iOS config)
- Private Key ID: `7f44e5800ab5ffbb6feca5853407c91199d64801`

### iOS Entitlements
- `aps-environment`: `development` (debug) / `production` (release)

---

## Summary

The root cause appears to be the service account not being authorized for FCM API calls, despite having the correct roles. The OAuth2 token generation works, but FCM specifically rejects the requests.

Most likely solutions:
1. **Regenerate service account key** - Current key might be corrupted or in a bad state
2. **Check IAM Credentials API** - Might not be enabled
3. **iOS rebuild required** - AppDelegate changes need to be compiled into the app

The fact that Firebase Console test messages also don't deliver suggests there may also be an APNs configuration issue on the iOS side that needs to be resolved separately.
