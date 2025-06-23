# OneSignal Integration Setup Guide

## Overview
This project now includes OneSignal integration alongside the existing notification system. The hybrid approach ensures maximum compatibility and reliability.

## Environment Variables Required

Add these to your `.env` file:

```env
# OneSignal Configuration
VITE_ONESIGNAL_APP_ID=your-onesignal-app-id-here
VITE_ONESIGNAL_REST_API_KEY=your-onesignal-rest-api-key-here

# Legacy Push Notification (VAPID) - Keep for fallback
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key-here
```

## OneSignal Setup Steps

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
The OneSignal service worker is already configured at `/public/OneSignalSDKWorker.js`

## How the Hybrid System Works

### Notification Flow:
1. **OneSignal Priority**: System tries OneSignal first for push notifications
2. **Legacy Fallback**: If OneSignal fails, falls back to VAPID-based system
3. **Socket.IO**: Real-time in-app notifications continue to work as before
4. **Unified Interface**: All notifications appear in the same NotificationBell component

### System Status Indicators:
- **OneSignal**: Green badge when OneSignal is active
- **Legacy**: Blue badge when VAPID system is active
- **Socket**: Purple badge when real-time connections are active

## Features Added

### 1. Enhanced Push Notifications
- Rich media support (images, videos)
- Action buttons on notifications
- Advanced targeting and segmentation
- Delivery optimization

### 2. Better User Management
- Automatic user registration with OneSignal
- Role-based segmentation (admin/student)
- Hostel block and room number tagging

### 3. Advanced Analytics
- OneSignal dashboard analytics
- Delivery and engagement tracking
- A/B testing capabilities

### 4. Improved Reliability
- Automatic fallback to legacy system
- Better error handling
- Cross-browser compatibility

## Testing the Integration

### 1. Test Notification Button
- Click the notification bell
- If OneSignal is active, you'll see a "Send Test Notification" button
- Click it to send a test notification

### 2. Check System Status
- The notification panel shows which systems are active
- Look for the colored badges (OneSignal, Legacy, Socket)

### 3. Verify Permissions
- Check browser notification permissions
- OneSignal will request permissions automatically

## Troubleshooting

### OneSignal Not Working
1. Check environment variables are set correctly
2. Verify OneSignal App ID is valid
3. Check browser console for errors
4. Ensure HTTPS is enabled (required for push notifications)

### Legacy System Not Working
1. Check VAPID public key is set
2. Verify service worker is registered
3. Check browser support for push notifications

### Both Systems Not Working
1. Check browser notification permissions
2. Verify all environment variables are set
3. Check network connectivity
4. Review browser console for errors

## Migration Notes

### What's Changed:
- Added OneSignal SDK and utilities
- Created hybrid notification manager
- Updated NotificationBell component
- Enhanced PushNotificationInitializer

### What's Preserved:
- All existing Socket.IO functionality
- Current notification UI and UX
- Existing API endpoints
- User authentication flow

### Backward Compatibility:
- System works without OneSignal credentials
- Falls back to legacy system automatically
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
- [OneSignal Documentation](https://documentation.onesignal.com/)
- [OneSignal Support](https://onesignal.com/support)

For application-specific issues:
- Check the browser console for error messages
- Review the notification manager logs
- Verify all environment variables are correctly set 