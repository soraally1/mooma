'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User } from 'firebase/auth';
import { AuthService, UserData } from './auth';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signUp: (data: any) => Promise<void>;
  signIn: (data: any) => Promise<void>;
  signInWithGoogle: () => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Define public paths that don't require authentication
  const publicPaths = ['/', '/pages/login', '/pages/register', '/pages/landingpage'];

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChange(async (user) => {
      setUser(user);
      if (user) {
        const userData = await AuthService.getCurrentUserData();
        setUserData(userData);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Protect routes
  useEffect(() => {
    if (!loading) {
      const isPublicPath = publicPaths.includes(pathname);
      if (!user && !isPublicPath) {
        router.push('/pages/login');
      }
    }
  }, [user, loading, pathname, router]);

  const signUp = async (data: any) => {
    setLoading(true);
    try {
      const result = await AuthService.signUp(data);
      setUser(result.user);
      setUserData(result.userData);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (data: any) => {
    setLoading(true);
    try {
      const result = await AuthService.signIn(data);
      setUser(result.user);
      setUserData(result.userData);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await AuthService.signInWithGoogle();
      setUser(result.user);
      setUserData(result.userData);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await AuthService.signOut();
      setUser(null);
      setUserData(null);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    userData,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
