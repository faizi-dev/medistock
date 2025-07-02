import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const initializeFirebaseAdmin = (): App => {
    if (getApps().length > 0) {
        return getApps()[0];
    }

    // Use service account in dev/local
    if (process.env.NODE_ENV !== 'production') {
        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY,
        };

        // This check is crucial for local development to ensure all credentials are provided.
        if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
            throw new Error(
                'Firebase server-side configuration is missing in .env file. For local development, please provide FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
            );
        }

        return initializeApp({
            credential: cert({
                ...serviceAccount,
                privateKey: serviceAccount.privateKey.replace(/\\n/g, '\n'),
            }),
        });
    }

    // In production (e.g., Firebase Hosting), use default credentials.
    // These are automatically provided by the environment. The SDK will
    // discover the project ID and other credentials.
    return initializeApp();
};

const adminApp = initializeFirebaseAdmin();
const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);

export { adminApp, adminAuth, adminDb };
