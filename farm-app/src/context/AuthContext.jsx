import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider, db } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

// Super Admin - has all permissions and can manage users
const SUPER_ADMIN_EMAIL = 'bratankumar93@gmail.com';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null); // 'super_admin', 'admin', 'viewer'
    const [loading, setLoading] = useState(true);
    const [allUsers, setAllUsers] = useState([]);

    // Listen for all users (for user management)
    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'users'),
            (snapshot) => {
                const users = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setAllUsers(users);
            },
            (error) => {
                console.log('Error loading users:', error);
            }
        );
        return () => unsubscribe();
    }, []);

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                // Determine role
                let role = 'viewer'; // Default role

                // Check if super admin
                if (currentUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
                    role = 'super_admin';
                } else {
                    // Check Firestore for user role
                    try {
                        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                        if (userDoc.exists() && userDoc.data().role) {
                            role = userDoc.data().role;
                        }
                    } catch (error) {
                        console.log('Error fetching user role:', error);
                    }
                }

                setUserRole(role);

                // Save/update user in Firestore
                try {
                    await setDoc(doc(db, 'users', currentUser.uid), {
                        email: currentUser.email,
                        displayName: currentUser.displayName,
                        photoURL: currentUser.photoURL,
                        lastLogin: new Date().toISOString(),
                        role: role
                    }, { merge: true });
                } catch (error) {
                    console.error('Error saving user:', error);
                }
            } else {
                setUserRole(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

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

    // Update user role (super admin only)
    const updateUserRole = async (userId, newRole) => {
        if (userRole !== 'super_admin') {
            throw new Error('Only super admin can change roles');
        }
        await setDoc(doc(db, 'users', userId), { role: newRole }, { merge: true });
    };

    // Permission helpers
    const isSuperAdmin = userRole === 'super_admin';
    const isAdmin = userRole === 'super_admin' || userRole === 'admin';
    const canEdit = isAdmin;

    const value = {
        user,
        userRole,
        loading,
        allUsers,
        isSuperAdmin,
        isAdmin,
        canEdit,
        signInWithGoogle,
        logout,
        updateUserRole
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
