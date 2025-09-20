# Firebase Push Notifications Setup

This guide explains how to set up Firebase Cloud Messaging (FCM) for push notifications in the AWARI platform.

## Prerequisites

1. A Google Cloud Project
2. Firebase project enabled
3. Firebase Admin SDK service account key

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or select existing project
3. Follow the setup wizard
4. Enable Google Analytics (optional)

## Step 2: Enable Cloud Messaging

1. In your Firebase project, go to "Project Settings"
2. Click on "Cloud Messaging" tab
3. Note down your "Server key" (legacy) or use the new approach with service account

## Step 3: Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to "IAM & Admin" > "Service Accounts"
4. Click "Create Service Account"
5. Fill in the details:
   - Name: `firebase-admin-sdk`
   - Description: `Firebase Admin SDK for push notifications`
6. Click "Create and Continue"
7. Grant roles:
   - `Firebase Admin SDK Administrator Service Agent`
   - `Firebase Cloud Messaging Admin`
8. Click "Done"

## Step 4: Generate Service Account Key

1. Click on the created service account
2. Go to "Keys" tab
3. Click "Add Key" > "Create new key"
4. Choose "JSON" format
5. Download the JSON file

## Step 5: Configure Environment Variables

Add these environment variables to your `.env` file:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project-id.iam.gserviceaccount.com
FIREBASE_UNIVERSE_DOMAIN=googleapis.com
```

### Important Notes:

1. **Private Key Format**: The `FIREBASE_PRIVATE_KEY` should include the full private key with `\n` characters for line breaks
2. **Quotes**: Wrap the private key in quotes and use `\n` for actual line breaks
3. **File Path**: Make sure the `.env` file is in your project root directory

## Step 6: Test the Setup

1. Restart your application
2. Check the console logs for:
   - `✅ Firebase Messaging initialized successfully` (success)
   - `⚠️ Firebase credentials not found. Push notifications will be disabled.` (missing credentials)

## Step 7: Frontend Integration (Optional)

For mobile apps, you'll need to:

1. Add Firebase SDK to your mobile app
2. Request notification permissions
3. Get FCM tokens
4. Send tokens to your backend

### Example Frontend Code:

```javascript
// Get FCM token
import { getMessaging, getToken } from "firebase/messaging";

const messaging = getMessaging();
getToken(messaging, { vapidKey: 'YOUR_VAPID_KEY' }).then((currentToken) => {
  if (currentToken) {
    // Send token to your backend
    sendTokenToServer(currentToken);
  } else {
    console.log('No registration token available.');
  }
}).catch((err) => {
  console.log('An error occurred while retrieving token. ', err);
});
```

## Troubleshooting

### Common Issues:

1. **"Service account object must contain a string 'private_key' property"**
   - Check that `FIREBASE_PRIVATE_KEY` is properly formatted with `\n` characters
   - Ensure the private key is wrapped in quotes

2. **"Invalid credential"**
   - Verify all environment variables are correct
   - Check that the service account has proper permissions

3. **"Project not found"**
   - Verify `FIREBASE_PROJECT_ID` matches your Firebase project ID

4. **Push notifications not working**
   - Check that the user has a valid `pushToken` in the database
   - Verify the FCM token is valid and not expired

### Debug Mode:

Enable debug logging by setting:

```env
NODE_ENV=development
```

This will show detailed logs about Firebase initialization and push notification attempts.

## Alternative: Disable Push Notifications

If you don't want to use push notifications right now, the system will work fine without Firebase. The notification service will:

1. Skip push notifications gracefully
2. Still send email and in-app notifications
3. Log warnings instead of crashing

## Security Best Practices

1. **Never commit** the service account JSON file to version control
2. **Use environment variables** for all sensitive data
3. **Rotate keys** regularly
4. **Limit permissions** to only what's needed
5. **Monitor usage** in Google Cloud Console

## Production Considerations

1. **Rate Limiting**: Implement rate limiting for push notifications
2. **Error Handling**: Handle FCM errors gracefully
3. **Token Management**: Implement token refresh logic
4. **Analytics**: Track push notification delivery rates
5. **Testing**: Test with real devices before production

## Support

If you encounter issues:

1. Check the [Firebase Documentation](https://firebase.google.com/docs/cloud-messaging)
2. Review the [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
3. Check the application logs for specific error messages
4. Verify all environment variables are correctly set

