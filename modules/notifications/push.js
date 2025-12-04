import admin from 'firebase-admin';
import { Expo } from 'expo-server-sdk';

class PushNotificationService {
    constructor() {
        if (!PushNotificationService.instance) {
            this.initialize();
            PushNotificationService.instance = this;
        }
        return PushNotificationService.instance;
    }

    initialize() {
        try {
            // Initialize Expo Push API client (always available, no credentials needed)
            this.expo = new Expo();
            console.log('✅ Expo Push API client initialized');

            // Check if Firebase credentials are available
            if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY) {
                console.warn('⚠️ Firebase credentials not found. FCM push notifications will be disabled.');
                this.messaging = null;
                return;
            }

            if (!admin.apps.length) {
                const serviceAccount = {
                    type: "service_account",
                    project_id: process.env.FIREBASE_PROJECT_ID,
                    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
                    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                    client_email: process.env.FIREBASE_CLIENT_EMAIL,
                    client_id: process.env.FIREBASE_CLIENT_ID,
                    auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
                    token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
                    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
                    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
                    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN || 'googleapis.com'
                };

                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
            }
            
            this.messaging = admin.messaging();
            console.log('✅ Firebase Messaging initialized successfully');
        } catch (error) {
            console.warn('⚠️ Firebase Messaging initialization failed. Push notifications will be disabled:', error.message);
            this.messaging = null;
        }
    }

    /**
     * Check if token is an Expo push token
     * Expo tokens start with "ExponentPushToken[" or "ExpoPushToken["
     */
    isExpoPushToken(token) {
        return typeof token === 'string' && (
            token.startsWith('ExponentPushToken[') || 
            token.startsWith('ExpoPushToken[') ||
            token.startsWith('ExponentPushToken:')
        );
    }

    async sendToDevice(token, notification) {
        try {
            // Check if token is Expo push token
            if (this.isExpoPushToken(token)) {
                return await this.sendExpoPushNotification(token, notification);
            }

            // Otherwise, use Firebase FCM
            if (!this.messaging) {
                console.warn('⚠️ Firebase Messaging not initialized. Push notification skipped.');
                return { success: false, error: 'Firebase not initialized' };
            }

            const message = this.buildMessage(token, notification);
            const response = await this.messaging.send(message);
            console.log('Successfully sent FCM message:', response);
            return response;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    /**
     * Send notification via Expo Push API
     */
    async sendExpoPushNotification(token, notification) {
        try {
            if (!this.expo) {
                console.warn('⚠️ Expo Push API not initialized. Push notification skipped.');
                return { success: false, error: 'Expo Push API not initialized' };
            }

            // Check if token is valid Expo push token
            if (!Expo.isExpoPushToken(token)) {
                console.warn('⚠️ Invalid Expo push token:', token);
                return { success: false, error: 'Invalid Expo push token' };
            }

            // Build Expo push message
            const messages = [{
                to: token,
                sound: 'default',
                title: notification.title,
                body: notification.body,
                data: notification.data || {},
                badge: 1,
            }];

            // Send notification
            const chunks = this.expo.chunkPushNotifications(messages);
            const tickets = [];

            for (const chunk of chunks) {
                try {
                    const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
                    tickets.push(...ticketChunk);
                } catch (error) {
                    console.error('Error sending Expo push notification chunk:', error);
                    throw error;
                }
            }

            // Check for errors in tickets
            const errors = [];
            for (const ticket of tickets) {
                if (ticket.status === 'error') {
                    errors.push(ticket.message || 'Unknown error');
                }
            }

            if (errors.length > 0) {
                console.error('Expo push notification errors:', errors);
                return { success: false, error: errors.join(', ') };
            }

            console.log('✅ Successfully sent Expo push notification');
            return { success: true, tickets };
        } catch (error) {
            console.error('Error sending Expo push notification:', error);
            throw error;
        }
    }

    async sendToMultipleDevices(tokens, notification) {
        try {
            if (!this.messaging) {
                console.warn('⚠️ Firebase Messaging not initialized. Push notifications skipped.');
                return { successCount: 0, failureCount: tokens.length, responses: [] };
            }

            const message = this.buildMulticastMessage(tokens, notification);
            const response = await this.messaging.sendMulticast(message);
            console.log('Successfully sent messages:', response);
            return {
                successCount: response.successCount,
                failureCount: response.failureCount,
                responses: response.responses
            };
        } catch (error) {
            console.error('Error sending messages:', error);
            throw error;
        }
    }

    async sendToTopic(topic, notification) {
        try {
            if (!this.messaging) {
                console.warn('⚠️ Firebase Messaging not initialized. Push notification to topic skipped.');
                return { success: false, error: 'Firebase not initialized' };
            }

            const message = this.buildMessage(topic, notification, true);
            const response = await this.messaging.send(message);
            console.log('Successfully sent message to topic:', response);
            return response;
        } catch (error) {
            console.error('Error sending message to topic:', error);
            throw error;
        }
    }

    async subscribeToTopic(tokens, topic) {
        try {
            if (!this.messaging) {
                console.warn('⚠️ Firebase Messaging not initialized. Topic subscription skipped.');
                return { success: false, error: 'Firebase not initialized' };
            }

            const response = await this.messaging.subscribeToTopic(tokens, topic);
            console.log('Successfully subscribed to topic:', response);
            return response;
        } catch (error) {
            console.error('Error subscribing to topic:', error);
            throw error;
        }
    }

    async unsubscribeFromTopic(tokens, topic) {
        try {
            if (!this.messaging) {
                console.warn('⚠️ Firebase Messaging not initialized. Topic unsubscription skipped.');
                return { success: false, error: 'Firebase not initialized' };
            }

            const response = await this.messaging.unsubscribeFromTopic(tokens, topic);
            console.log('Successfully unsubscribed from topic:', response);
            return response;
        } catch (error) {
            console.error('Error unsubscribing from topic:', error);
            throw error;
        }
    }

    buildMessage(recipient, notification, isTopic = false) {
        return {
            [isTopic ? 'topic' : 'token']: recipient,
            notification: {
                title: notification.title,
                body: notification.body
            },
            data: notification.data || {},
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    priority: 'high',
                    channelId: 'default'
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1
                    }
                }
            }
        };
    }

    buildMulticastMessage(tokens, notification) {
        return {
            tokens,
            notification: {
                title: notification.title,
                body: notification.body
            },
            data: notification.data || {},
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    priority: 'high',
                    channelId: 'default'
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1
                    }
                }
            }
        };
    }
}


export const pushNotificationService = new PushNotificationService();