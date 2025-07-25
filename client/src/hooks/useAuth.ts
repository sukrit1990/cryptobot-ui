import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  // Check local session first
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/session"],
    retry: false,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache results (React Query v5)
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
