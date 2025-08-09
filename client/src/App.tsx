import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Settings from "@/pages/settings";
import Subscribe from "@/pages/subscribe";
import Checkout from "@/pages/checkout";
import GeminiGuide from "@/pages/gemini-guide";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";

function AuthenticatedApp({ user }: { user: any }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/settings" component={Settings} />
        <Route path="/subscribe" component={Subscribe} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/gemini-guide" component={GeminiGuide} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 sm:w-12 sm:h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/gemini-guide" component={GeminiGuide} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      {!isAuthenticated ? (
        <Route component={Landing} />
      ) : (
        <Route path="*" component={() => <AuthenticatedApp user={user} />} />
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
