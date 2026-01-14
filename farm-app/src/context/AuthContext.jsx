import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider, db } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

// Default admin emails - can be updated in Firestore settings/admins document
const DEFAULT_ADMINS = [
    'ratankumar@example.com',  // Will be replaced with actual admin emails
];

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [adminEmails, setAdminEmails] = useState(DEFAULT_ADMINS);

    // Load admin list from Firestore
    useEffect(() => {
        const loadAdmins = async () => {
            try {
                const adminsDoc = await getDoc(doc(db, 'settings', 'admins'));
                if (adminsDoc.exists()) {
                    const data = adminsDoc.data();
                    if (data.emails && Array.isArray(data.emails)) {
                        setAdminEmails(data.emails);
                    }
                }
            } catch (error) {
                console.log('Using default admin list');
            }
        };
        loadAdmins();
    }, []);

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Check if user is admin
                const isUserAdmin = adminEmails.some(
                    email => email.toLowerCase() === currentUser.email?.toLowerCase()
                );
                setIsAdmin(isUserAdmin);

                // Save user to Firestore for tracking
                try {
                    await setDoc(doc(db, 'users', currentUser.uid), {
                        email: currentUser.email,
                        displayName: currentUser.displayName,
                        photoURL: currentUser.photoURL,
                        lastLogin: new Date().toISOString(),
                        isAdmin: isUserAdmin
                    }, { merge: true });
                } catch (error) {
                    console.error('Error saving user:', error);
                }
            } else {
                setIsAdmin(false);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [adminEmails]);

    // Sign in with Google
    const signInWithGoogle = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            return result.user;
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    };

    // Sign out
    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    };

    const value = {
        user,
        isAdmin,
        loading,
        signInWithGoogle,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
