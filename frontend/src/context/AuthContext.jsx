import React, { createContext, useContext, useEffect, useState } from "react";
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updatePassword,
  updateProfile,
} from "firebase/auth";

import { auth, googleProvider } from "../lib/firebase";
import { getPasswordPolicyError } from "../lib/passwordPolicy";

const AuthContext = createContext(null);

function hasProvider(user, providerId) {
  return Boolean(
    user?.providerData?.some(
      (provider) => provider?.providerId === providerId
    )
  );
}

function cleanEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function cleanName(name) {
  return String(name || "").trim().replace(/\s+/g, " ");
}

function createClientError(message, code = "app/auth-error") {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authRevision, setAuthRevision] = useState(0);

  const applyUser = (nextUser) => {
    setUser(nextUser || null);
    setAuthRevision((current) => current + 1);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      applyUser(currentUser || null);
      setAuthLoading(false);

      if (currentUser) {
        setAuthModalOpen(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);

    applyUser(result.user);
    setAuthModalOpen(false);

    return result.user;
  };

  const createEmailPasswordAccount = async ({
    name,
    email,
    password,
  }) => {
    const cleanUserName = cleanName(name);
    const cleanUserEmail = cleanEmail(email);
    const passwordError = getPasswordPolicyError(password);

    if (cleanUserName.length < 2 || cleanUserName.length > 80) {
      throw createClientError(
        "User name must be between 2 and 80 characters."
      );
    }

    if (!cleanUserEmail) {
      throw createClientError("Email address is required.");
    }

    if (passwordError) {
      throw createClientError(passwordError);
    }

    const result = await createUserWithEmailAndPassword(
      auth,
      cleanUserEmail,
      password
    );

    await updateProfile(result.user, {
      displayName: cleanUserName,
    });

    await sendEmailVerification(result.user);

    await result.user.reload();

    applyUser(auth.currentUser || result.user);
    setAuthModalOpen(false);

    return auth.currentUser || result.user;
  };

  const signInWithEmailPassword = async ({ email, password }) => {
    const cleanUserEmail = cleanEmail(email);

    if (!cleanUserEmail || !password) {
      throw createClientError("Email and password are required.");
    }

    const result = await signInWithEmailAndPassword(
      auth,
      cleanUserEmail,
      password
    );

    applyUser(result.user);
    setAuthModalOpen(false);

    return result.user;
  };

  const sendVerificationEmailForCurrentUser = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser?.email) {
      throw createClientError("Account email is required.");
    }

    if (currentUser.emailVerified) {
      return currentUser;
    }

    await sendEmailVerification(currentUser);

    return currentUser;
  };

  const refreshCurrentUser = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return null;
    }

    await currentUser.reload();
    await currentUser.getIdToken(true);

    applyUser(auth.currentUser || currentUser);

    return auth.currentUser || currentUser;
  };

  // Google login user ke liye password login enable karega.
  const addPasswordToCurrentAccount = async ({ password }) => {
    const currentUser = auth.currentUser;
    const passwordError = getPasswordPolicyError(password);

    if (!currentUser?.email) {
      throw createClientError(
        "A verified account email is required before creating a password."
      );
    }

    if (hasProvider(currentUser, "password")) {
      throw createClientError(
        "Password login is already enabled for this account."
      );
    }

    if (passwordError) {
      throw createClientError(passwordError);
    }

    const credential = EmailAuthProvider.credential(
      currentUser.email,
      password
    );

    const result = await linkWithCredential(currentUser, credential);

    await result.user.reload();

    applyUser(auth.currentUser || result.user);

    return auth.currentUser || result.user;
  };

  // Existing password user ke liye password change karega.
  const changePasswordForCurrentAccount = async ({
    currentPassword,
    newPassword,
  }) => {
    const currentUser = auth.currentUser;

    if (!currentUser?.email) {
      throw createClientError("Account email is required.");
    }

    if (!hasProvider(currentUser, "password")) {
      throw createClientError(
        "Password login is not enabled for this account yet."
      );
    }

    if (!currentPassword) {
      throw createClientError("Current password is required.");
    }

    const passwordError = getPasswordPolicyError(newPassword);

    if (passwordError) {
      throw createClientError(passwordError);
    }

    if (currentPassword === newPassword) {
      throw createClientError(
        "New password must be different from your current password."
      );
    }

    const credential = EmailAuthProvider.credential(
      currentUser.email,
      currentPassword
    );

    await reauthenticateWithCredential(currentUser, credential);

    await updatePassword(currentUser, newPassword);

    await currentUser.reload();

    applyUser(auth.currentUser || currentUser);

    return auth.currentUser || currentUser;
  };

  // Email/password user ke same account me Google sign-in connect karega.
  const connectGoogleToCurrentAccount = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw createClientError("Please sign in before connecting Google.");
    }

    if (hasProvider(currentUser, "google.com")) {
      throw createClientError(
        "Google sign-in is already connected to this account."
      );
    }

    const result = await linkWithPopup(currentUser, googleProvider);

    await result.user.reload();

    applyUser(auth.currentUser || result.user);

    return auth.currentUser || result.user;
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    applyUser(null);
  };

  const requireAuth = () => {
    if (!user) {
      setAuthModalOpen(true);
      return false;
    }

    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authLoading,
        authRevision,
        authModalOpen,
        setAuthModalOpen,

        signInWithGoogle,
        createEmailPasswordAccount,
        signInWithEmailPassword,
        sendVerificationEmailForCurrentUser,
        refreshCurrentUser,
        addPasswordToCurrentAccount,
        changePasswordForCurrentAccount,
        connectGoogleToCurrentAccount,

        hasPasswordProvider: hasProvider(user, "password"),
        hasGoogleProvider: hasProvider(user, "google.com"),

        signOut,
        requireAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}