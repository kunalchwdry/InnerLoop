import React, { createContext, useState, useContext, useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import { db } from '@/lib/supabaseApi';

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string} full_name
 * @property {string} [avatar_url]
 */

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  /** @type {{id:string, email:string, full_name:string, avatar_url?:string}|null} */
  const [user, setUser] = /** @type {[{id:string, email:string, full_name:string, avatar_url?:string}|null, React.Dispatch<React.SetStateAction<{id:string, email:string, full_name:string, avatar_url?:string}|null>>]} */ (useState(null));
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  
  // Derive isAuthenticated from user to avoid race conditions
  const isAuthenticated = !!user;

  useEffect(() => {
    checkAuth();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || session.user.email,
          avatar_url: session.user.user_metadata?.avatar_url,
        });
        setIsLoadingAuth(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsLoadingAuth(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Update user info on token refresh
        setUser({
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || session.user.email,
          avatar_url: session.user.user_metadata?.avatar_url,
        });
      }
      // For other events (PASSWORD_RECOVERY, USER_UPDATED, etc.), don't change loading state
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await db.auth.me();
      setUser(currentUser);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setUser(null);
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    
    if (shouldRedirect) {
      db.auth.logout(window.location.href);
    } else {
      db.auth.logout();
    }
  };

  const navigateToLogin = () => {
    db.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      authError,
      logout,
      navigateToLogin,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};