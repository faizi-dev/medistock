
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const initializeFirebaseAdmin = (): App => {
    // Check if the app is already initialized
    if (getApps().length > 0) {
        return getApps()[0];
    }
    
    // In a Google Cloud environment (like Firebase App Hosting),
    // initializeApp() will automatically use Application Default Credentials.
    return initializeApp();
};

const adminApp = initializeFirebaseAdmin();
const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);

export { adminApp, adminAuth, adminDb };
