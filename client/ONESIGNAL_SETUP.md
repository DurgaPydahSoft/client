# OneSignal v16 Integration Setup Guide

## Overview
This project now includes OneSignal v16 integration using the official OneSignal Web SDK. The system uses the latest OneSignal v16 API with deferred initialization for optimal performance.

## Environment Variables Required

Add these to your `.env` file:

```env
# OneSignal Configuration
VITE_ONESIGNAL_APP_ID=your-onesignal-app-id-here
VITE_ONESIGNAL_REST_API_KEY=your-onesignal-rest-api-key-here

# API Configuration
VITE_API_URL=http://localhost:5000
```

## OneSignal v16 Setup Steps

### 1. Create OneSignal Account
1. Go to [OneSignal.com](https://onesignal.com)
2. Sign up for a free account
3. Create a new app for your hostel management system

### 2. Configure Web Push Settings
1. In your OneSignal dashboard, go to Settings > Web Push
2. Configure your site settings:
   - Site Name: Hostel Complaint Management System
   - Site URL: Your domain URL
   - Default Notification Icon: Upload your app icon
   - Default Notification Image: Upload a default image

### 3. Get Your Credentials
1. Go to Settings > Keys & IDs
2. Copy your **App ID** and **REST API Key**
3. Add them to your `.env` file

### 4. Configure Service Worker
The OneSignal v16 service worker is configured at `/public/OneSignalSDKWorker.js` with the new format:
```javascript
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
```

## How the OneSignal v16 System Works

### SDK Loading:
1. **Deferred Loading**: Uses OneSignal's official deferred initialization pattern
2. **Automatic Initialization**: SDK initializes automatically when ready
3. **Fallback Support**: Falls back to database notifications if OneSignal fails

### Notification Flow:
1. **OneSignal v16 Priority**: System uses OneSignal v16 for push notifications
2. **Database Fallback**: If OneSignal fails, falls back to database notifications
3. **Socket.IO**: Real-time in-app notifications continue to work as before
4. **Unified Interface**: All notifications appear in the same NotificationBell component

### New v16 API Features:
- **OneSignal.login()**: New method for setting external user ID
- **OneSignal.User.PushSubscription**: New subscription management API
- **OneSignal.Notifications**: New notification permission and event API
- **Deferred Initialization**: Better performance and reliability

## Features Added

### 1. Enhanced Push Notifications (v16)
- Rich media support (images, videos)
- Action buttons on notifications
- Advanced targeting and segmentation
- Delivery optimization
- Better browser compatibility

### 2. Improved User Management (v16)
- Automatic user registration with OneSignal
- Role-based segmentation (admin/student)
- Hostel block and room number tagging
- New login/logout API

### 3. Advanced Analytics (v16)
- OneSignal dashboard analytics
- Delivery and engagement tracking
- A/B testing capabilities
- Better conversion tracking

### 4. Improved Reliability (v16)
- Deferred initialization for better performance
- Automatic fallback to database system
- Better error handling
- Cross-browser compatibility
- Service worker improvements

## Testing the Integration

### 1. Test OneSignal v16 Setup
- Open `test-onesignal-v16.html` in your browser
- Check if OneSignal v16 initializes correctly
- Verify the new API structure is available

### 2. Test Notification Button
- Click the notification bell
- If OneSignal is active, you'll see a "Send Test Notification" button
- Click it to send a test notification

### 3. Check System Status
- The notification panel shows which systems are active
- Look for the colored badges (OneSignal, Database, Socket)

### 4. Verify Permissions
- Check browser notification permissions
- OneSignal will request permissions automatically

## Troubleshooting

### OneSignal v16 Not Working
1. Check environment variables are set correctly
2. Verify OneSignal App ID is valid
3. Check browser console for errors
4. Ensure HTTPS is enabled (required for push notifications)
5. Test with `test-onesignal-v16.html`

### Service Worker Issues
1. Check if service worker is registered
2. Verify service worker file is accessible
3. Clear browser cache and reload
4. Check browser developer tools > Application > Service Workers

### Network Issues
1. Check if OneSignal CDN is accessible
2. Use `network-test.html` to diagnose connectivity
3. Check firewall/proxy settings
4. Try different network connection

## Migration from Previous Version

### What's Changed:
- Updated to OneSignal SDK v16
- New deferred initialization pattern
- Updated API methods (login, User.PushSubscription, etc.)
- Improved service worker configuration
- Better error handling and fallbacks

### What's Preserved:
- All existing Socket.IO functionality
- Current notification UI and UX
- Existing API endpoints
- User authentication flow

### Backward Compatibility:
- System works without OneSignal credentials
- Falls back to database system automatically
- No breaking changes to existing features

## Next Steps

### Phase 2 Enhancements (Optional):
1. Implement OneSignal Journeys for automated workflows
2. Add rich media notifications with images
3. Enable advanced targeting and segmentation
4. Implement A/B testing for notifications

### Phase 3 Full Migration (Optional):
1. Replace legacy service worker with OneSignal
2. Migrate to OneSignal's real-time features
3. Implement comprehensive analytics
4. Add multi-channel support (email, SMS)

## Support

For OneSignal-specific issues:
- [OneSignal v16 Documentation](https://documentation.onesignal.com/docs/web-sdk-setup)
- [OneSignal Support](https://onesignal.com/support)

For application-specific issues:
- Check the browser console for error messages
- Review the notification manager logs
- Verify all environment variables are correctly set
- Test with the provided test files 