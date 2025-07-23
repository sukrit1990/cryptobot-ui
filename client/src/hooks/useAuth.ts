import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  // Check local session first
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/session"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
