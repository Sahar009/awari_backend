import admin from 'firebase-admin';

class FirebaseService {
    constructor() {
        if (!FirebaseService.instance) {
            this.initialize();
            FirebaseService.instance = this;
        }
        return FirebaseService.instance;
    }

    initialize() {
        try {
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

            // Initialize Firebase Admin only if not already initialized
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
            }

            this.auth = admin.auth();
            console.log('Firebase Auth initialized successfully');
        } catch (error) {
            console.error('Firebase Auth initialization error:', error);
            throw error;
        }
    }

    // Auth Methods
    async verifyIdToken(idToken) {
        try {
            const decodedToken = await this.auth.verifyIdToken(idToken, true);
            return decodedToken;
        } catch (error) {
            console.error('Token verification error:', error);
            throw new Error(`Token verification failed: ${error.message}`);
        }
    }

    async getUserByEmail(email) {
        try {
            const userRecord = await this.auth.getUserByEmail(email);
            return userRecord;
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                return null;
            }
            throw error;
        }
    }

    async createCustomToken(uid, claims = {}) {
        try {
            const token = await this.auth.createCustomToken(uid, claims);
            return token;
        } catch (error) {
            console.error('Error creating custom token:', error);
            throw error;
        }
    }
}


export const firebaseService = new FirebaseService(); 