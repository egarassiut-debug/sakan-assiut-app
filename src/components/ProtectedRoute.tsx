import React, { useEffect, useState } from 'react';
import { AppUser } from '../types/property';
import { isSecureAdminSession } from '../utils/security';

export interface ProtectedRouteProps {
  currentUser: AppUser | null;
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user';
  redirectTo?: string;
  onUnauthorized?: () => void;
}

/**
 * ProtectedRoute Component
 * Strictly enforces authorization before granting access to protected routes (e.g., /admin).
 * If the user is unauthenticated or does not have admin permissions (e.g. regular user),
 * it silently redirects to '/' immediately without rendering any DOM elements or error messages
 * that could expose the existence or structure of the admin dashboard.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  currentUser,
  children,
  requiredRole = 'admin',
  redirectTo = '/',
  onUnauthorized,
}) => {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function evaluateAccess() {
      // 1. Check if user is logged in
      if (!currentUser) {
        handleRedirect();
        return;
      }

      // 2. Check user role
      if (currentUser.role !== requiredRole) {
        handleRedirect();
        return;
      }

      // 3. For admin role, enforce cryptographic session integrity check
      if (requiredRole === 'admin') {
        const hasValidSession = await isSecureAdminSession(currentUser);
        if (!hasValidSession) {
          handleRedirect();
          return;
        }
      }

      if (!isCancelled) {
        setIsAuthorized(true);
      }
    }

    function handleRedirect() {
      if (isCancelled) return;
      setIsAuthorized(false);

      // Silently rewrite browser location to the redirect path (defaults to '/')
      try {
        if (window.location.pathname !== redirectTo) {
          window.history.replaceState(null, '', redirectTo);
        }
      } catch (e) {
        console.error('Redirect failed:', e);
      }

      // Notify parent container to switch view/tab if needed
      onUnauthorized?.();
    }

    evaluateAccess();

    return () => {
      isCancelled = true;
    };
  }, [currentUser, requiredRole, redirectTo, onUnauthorized]);

  // While checking, or if unauthorized, render absolutely nothing
  if (isAuthorized !== true) {
    return null;
  }

  // Only render the protected admin UI when authorization is strictly validated
  return <>{children}</>;
};
