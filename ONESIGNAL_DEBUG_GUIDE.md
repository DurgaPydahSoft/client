# OneSignal Push Notification Debug Guide

## 🔧 Issues Fixed

### 1. **API Endpoint Correction**
- **Before**: `https://onesignal.com/api/v1/notifications`
- **After**: `https://api.onesignal.com/notifications`
- **Impact**: This was the main reason push notifications weren't working

### 2. **Missing Required Parameters**
Added according to [OneSignal documentation](https://documentation.onesignal.com/reference/push-notification):
- `channel_for_external_user_ids: "push"` - Required for targeting specific users
- `isAnyWeb: true` - Ensures web push is enabled
- `enable_frequency_cap: true` - Prevents notification spam
- `web_buttons` instead of `buttons` - Correct parameter for web push

### 3. **Enhanced Error Logging**
- Added detailed error response logging
- Shows HTTP status codes and error messages
- Helps identify specific OneSignal API issues

### 4. **Improved Frontend Initialization**
- Better OneSignal SDK v16 initialization
- Proper external user ID setting
- Enhanced permission handling
- Added connection testing

## 🧪 Testing Steps

### Step 1: Check Environment Variables
```bash
# Backend (.env)
ONESIGNAL_APP_ID=your-app-id-here
ONESIGNAL_REST_API_KEY=your-rest-api-key-here

# Frontend (.env)
VITE_ONESIGNAL_APP_ID=your-app-id-here
```

### Step 2: Test OneSignal Connection
1. Open browser console
2. Click notification bell
3. Click "Test OneSignal Connection"
4. Check console for detailed results

### Step 3: Test Push Notification
1. Ensure notifications are enabled
2. Click "Test Push Notification"
3. Check for push notification in browser
4. Review console logs for any errors

### Step 4: Check OneSignal Dashboard
1. Go to [OneSignal Dashboard](https://app.onesignal.com)
2. Check "Audience" tab for user subscriptions
3. Check "Messages" tab for delivery status
4. Verify web push certificates are configured

## 🔍 Debugging Checklist

### Backend Issues
- [ ] Environment variables are set correctly
- [ ] OneSignal App ID matches dashboard
- [ ] REST API Key is valid
- [ ] API endpoint is correct (`https://api.onesignal.com/notifications`)
- [ ] User IDs are being sent as strings
- [ ] Payload includes required parameters

### Frontend Issues
- [ ] OneSignal SDK v16 is loading
- [ ] Service worker is registered
- [ ] User is logged in with OneSignal
- [ ] Notification permissions are granted
- [ ] External user ID is set correctly

### OneSignal Dashboard Issues
- [ ] Web push certificates are configured
- [ ] App is properly set up for web push
- [ ] Users are appearing in audience
- [ ] Messages are being sent (check delivery logs)

## 🚨 Common Issues & Solutions

### Issue 1: "No users to send to"
**Cause**: Users not properly registered with OneSignal
**Solution**: 
- Ensure `OneSignal.login(userId)` is called
- Check that external user IDs match between frontend and backend

### Issue 2: "Invalid app_id"
**Cause**: Wrong OneSignal App ID
**Solution**:
- Verify App ID in OneSignal dashboard
- Check environment variables

### Issue 3: "Invalid REST API key"
**Cause**: Wrong or expired API key
**Solution**:
- Generate new REST API key in OneSignal dashboard
- Update environment variable

### Issue 4: "No push tokens"
**Cause**: Users haven't granted notification permissions
**Solution**:
- Request notification permissions
- Ensure HTTPS is used (required for push notifications)

### Issue 5: "Service worker not found"
**Cause**: Service worker not properly registered
**Solution**:
- Check `OneSignalSDKWorker.js` is in public folder
- Verify service worker registration in browser

## 📊 Monitoring & Logs

### Backend Logs
Look for these log messages:
```
🔔 OneSignal notification sent successfully
🔔 OneSignal payload: {...}
🔔 OneSignal API Error Details: {...}
```

### Frontend Logs
Look for these log messages:
```
🔔 OneSignal SDK v16 initialized successfully
🔔 External user ID set successfully
🔔 Permission granted successfully
🔔 Notification listeners set up successfully
```

### Browser Console
Check for:
- OneSignal SDK loading errors
- Service worker registration errors
- Permission request results
- Notification click events

## 🛠️ Manual Testing Commands

### Test OneSignal Connection
```bash
curl -X GET "https://api.onesignal.com/apps/YOUR_APP_ID" \
  -H "Authorization: Basic YOUR_REST_API_KEY"
```

### Test Push Notification
```bash
curl -X POST "https://api.onesignal.com/notifications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic YOUR_REST_API_KEY" \
  -d '{
    "app_id": "YOUR_APP_ID",
    "include_external_user_ids": ["USER_ID"],
    "headings": {"en": "Test Notification"},
    "contents": {"en": "This is a test notification"},
    "isAnyWeb": true,
    "channel_for_external_user_ids": "push"
  }'
```

## 📱 Browser Requirements

### For Push Notifications:
- **HTTPS required** (except localhost for development)
- **Modern browser** (Chrome, Firefox, Safari, Edge)
- **Notification permissions granted**
- **Service worker support**

### Browser Console Commands
```javascript
// Check OneSignal status
console.log('OneSignal:', window.OneSignal);

// Check notification permission
console.log('Permission:', Notification.permission);

// Check service worker
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers:', registrations);
});
```

## 🔄 Troubleshooting Flow

1. **Check Environment Variables** → Verify OneSignal credentials
2. **Test Connection** → Use "Test OneSignal Connection" button
3. **Check User Registration** → Verify user appears in OneSignal dashboard
4. **Test Push Notification** → Use "Test Push Notification" button
5. **Check Browser Console** → Look for errors and logs
6. **Verify OneSignal Dashboard** → Check delivery status and logs

## 📞 Support

If issues persist:
1. Check OneSignal documentation: https://documentation.onesignal.com
2. Review OneSignal dashboard logs
3. Check browser console for detailed error messages
4. Verify all environment variables are correct
5. Ensure HTTPS is used in production

## 🎯 Expected Behavior

After fixes:
- ✅ OneSignal connection test should pass
- ✅ Test push notification should appear in browser
- ✅ Users should be registered in OneSignal dashboard
- ✅ Real notifications should work for complaints, announcements, etc.
- ✅ Database notifications should continue working as fallback 