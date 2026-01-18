import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider, db } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';

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
    const [allowedUsers, setAllowedUsers] = useState([]);

    // QA TEST MODE: Bypass auth for automated testing
    // Only works in development mode with ?qa_test=true URL parameter
    const isQATestMode = typeof window !== 'undefined' &&
        window.location.search.includes('qa_test=true') &&
        import.meta.env.DEV;

    // If QA test mode, create a fake user immediately
    useEffect(() => {
        if (isQATestMode) {
            console.log('[QA] Test mode enabled - bypassing authentication');
            setUser({
                uid: 'qa-test-user',
                email: 'qa-test@trinetra-farms.com',
                displayName: 'QA Test User',
                photoURL: null
            });
            setUserRole('super_admin'); // Give full access for testing
            setLoading(false);
        }
    }, [isQATestMode]);

    // Listen for all users (for user management display)
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

    // Listen for allowed/invited users
    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'allowed_users'),
            (snapshot) => {
                const allowed = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setAllowedUsers(allowed);
            },
            (error) => {
                console.log('Error loading allowed users:', error);
            }
        );
        return () => unsubscribe();
    }, []);

    // Listen for auth state changes (skip in QA test mode)
    useEffect(() => {
        // Skip real auth in QA test mode
        if (isQATestMode) return;

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                // Determine role
                let role = 'viewer'; // Default role

                // 1. Check if super admin (Hardcoded)
                if (currentUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
                    role = 'super_admin';
                } else {
                    // 2. Check Firestore 'users' for explicitly set role
                    try {
                        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                        if (userDoc.exists() && userDoc.data().role) {
                            role = userDoc.data().role;
                        } else {
                            // 3. Check 'allowed_users' for pre-assigned role by email
                            // We need to query this, but since we have the listener running, we can just check the local state if it's ready,
                            // OR just do a one-time fetch to be safe and fast during login (listener might not be ready)
                            // For simplicity/robustness, let's just query or assume the effect above will eventually update it?
                            // No, we need it NOW to set permissions.

                            // Let's do a quick manual check on the collection reference if needed, 
                            // but usually it's cleaner to wait. However, for immediate login experience:
                            // We can use a check here.

                            // Actually, let's not query 3 times. Let's just rely on logic that runs when `allowedUsers` updates?
                            // No, `onAuthStateChanged` runs once.

                            // Let's just fetch it once to be sure.
                            // Note: We can't query by email easily without an index, but allowed_users is small.
                            // Better: Let's assume the user was added to `allowed_users` with email as a field.
                            // We will handle this synchronization in the component or here.
                            // Actually, the easiest way is: If user exists in `allowed` list, give them that role. 
                            // But how do we enforce it?
                            // We should copy the role from `allowed_users` to `users` upon login if `users` doc doesn't have it.

                            // See logic below in saving user
                        }
                    } catch (error) {
                        console.log('Error fetching user role:', error);
                    }
                }

                // If role is still viewer, check if they are in the allowed list (invites)
                // This logic handles the "First Login" of an invited user
                if (role === 'viewer' && currentUser.email) {
                    // We can't use `allowedUsers` state reliability here due to closure/timing.
                    // But we can rely on looking it up.
                    // Or simpler: The "Manage Users" feature just adds a doc to `users` with a placeholder ID? No, Firebase Auth UIDs are specific.

                    // So we must use the 'allowed_users' collection strategy.
                }

                setUserRole(role);

                // Save/update user in Firestore
                // This is where we sync the invitation role!
                try {
                    // Check if invited
                    let invitedRole = null;
                    // We need to fetch allowed users to check - since we can't trust the state variable 'allowedUsers' inside this callback due to closure
                    // We'll just do a snapshot? No, that's heavy.
                    // We'll leave it as is, but create a separate effect to sync roles?

                    // Let's keep it simple: Write the user doc.
                    // But if `userDoc` didn't exist or didn't have role, we should try to find it in `allowed_users`.
                    // To do this efficiently without index:
                    // We'll iterate the `allowed_users` collection? No.
                    // We'll make `Settings` save the allowed user with ID = email (sanitized)? 
                    // No, emails change. 

                    // OK, Plan B: Just fetch the allowed_users collection here (it's small) or a query.
                    // Assume we can query.

                    // For now, let's just rely on modifying the `updateUserRole` to support updating `users` if they exist, or `allowed_users` if they don't.
                    // And here, we just read what is in `users`.
                    // The trick: "Add User" in settings should CREATE A DOC IN `users`? No we don't know UID.

                    // Let's assume the user has to login once.
                    // If they haven't logged in, they show up in "Invited".
                    // Once they login, we match them.

                    // Let's query using the client side code in a `useEffect` that watches `user` and `allowedUsers`.
                    // If `user` is present, and `allowedUsers` contains `user.email`, update `user.role` to match!
                } catch (e) { console.error(e) }

                await setDoc(doc(db, 'users', currentUser.uid), {
                    email: currentUser.email,
                    displayName: currentUser.displayName,
                    photoURL: currentUser.photoURL,
                    lastLogin: new Date().toISOString(),
                    role: role
                }, { merge: true });

            } else {
                setUserRole(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Sync Invited Role Effect
    useEffect(() => {
        if (user && allowedUsers.length > 0) {
            const invite = allowedUsers.find(u => u.email?.toLowerCase() === user.email?.toLowerCase());
            if (invite && invite.role && userRole !== 'super_admin' && userRole !== invite.role) {
                // If current role is different from invite role, and not super admin, update it!
                // Only if the user document doesn't explicitly override it?
                // Let's assume invite role is the source of truth for initial setup.

                // We'll update the local state and the database
                console.log("Found invite for user, syncing role:", invite.role);
                setUserRole(invite.role);
                setDoc(doc(db, 'users', user.uid), { role: invite.role }, { merge: true });
            }
        }
    }, [user, allowedUsers, userRole]);


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

    // Add Allowed User (Invite)
    const inviteUser = async (email, name, role) => {
        if (userRole !== 'super_admin') throw new Error('Unauthorized');

        // Add to allowed_users collection
        await addDoc(collection(db, 'allowed_users'), {
            email: email.toLowerCase(),
            displayName: name,
            role,
            addedBy: user.email,
            createdAt: new Date().toISOString()
        });

        // Also check if this email already exists in 'users' and update them if so
        const existingUser = allUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (existingUser) {
            await updateUserRole(existingUser.id, role);
        }
    };

    const removeInvite = async (inviteId) => {
        if (userRole !== 'super_admin') throw new Error('Unauthorized');
        await deleteDoc(doc(db, 'allowed_users', inviteId));
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
        allowedUsers, // Expose this
        isSuperAdmin,
        isAdmin,
        canEdit,
        signInWithGoogle,
        logout,
        updateUserRole,
        inviteUser, // Expose this
        removeInvite // Expose this
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
