import admin from 'firebase-admin';

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
            // Check if Firebase credentials are available
            if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY) {
                console.warn('⚠️ Firebase credentials not found. Push notifications will be disabled.');
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
                    auth_uri: process.env.FIREBASE_AUTH_URI,
                    token_uri: process.env.FIREBASE_TOKEN_URI,
                    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
                    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
                    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
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

    async sendToDevice(token, notification) {
        try {
            if (!this.messaging) {
                console.warn('⚠️ Firebase Messaging not initialized. Push notification skipped.');
                return { success: false, error: 'Firebase not initialized' };
            }

            const message = this.buildMessage(token, notification);
            const response = await this.messaging.send(message);
            console.log('Successfully sent message:', response);
            return response;
        } catch (error) {
            console.error('Error sending message:', error);
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