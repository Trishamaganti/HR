import { useAuth } from "@/contexts/AuthContext";
import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        const currentPath = window.location.pathname + window.location.search;
        setLocation(`/login?redirect=${encodeURIComponent(currentPath)}`);
      } else if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Wrong role for this work route — send them to their candidate profile
        setLocation("/candidate");
      }
    }
  }, [user, isLoading, allowedRoles, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || (allowedRoles && !allowedRoles.includes(user.role))) {
    return null;
  }

  return <>{children}</>;
}
