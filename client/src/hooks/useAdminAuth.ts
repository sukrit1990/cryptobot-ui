import { useQuery } from "@tanstack/react-query";

export function useAdminAuth() {
  const { data: adminSession, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/session"],
    retry: false,
  });

  return {
    adminSession,
    isLoading,
    isAdminAuthenticated: !!(adminSession as any)?.isAuthenticated,
  };
}