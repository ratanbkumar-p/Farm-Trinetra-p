import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
// Note: These values are safe to expose in client-side code - they are identifiers, not secrets.
// Security is handled by Firestore Rules.
const firebaseConfig = {
    apiKey: "AIzaSyD40e87qm2ttP5C0xpnLB4oLew2HDP5psU",
    authDomain: "trinetra-farms-tnf.firebaseapp.com",
    projectId: "trinetra-farms-tnf",
    storageBucket: "trinetra-farms-tnf.firebasestorage.app",
    messagingSenderId: "118549325448",
    appId: "1:118549325448:web:trinetra"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);
