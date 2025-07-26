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
import { 
  ChartLine, 
  Settings as SettingsIcon, 
  User,
  LogOut
} from "lucide-react";

function Sidebar({ user }: { user: any }) {
  const handleSignOut = async () => {
    try {
      await fetch("/api/signout", { method: "POST" });
      window.location.href = "/";
    } catch (error) {
      console.error("Sign out failed:", error);
      window.location.href = "/";
    }
  };

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center px-6 py-6 border-b border-gray-200">
          <div className="h-10 w-10 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center mr-3">
            <ChartLine className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">CryptoInvest Pro</h2>
            <p className="text-xs text-gray-500">Investment Dashboard</p>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          <a 
            href="/"
            className="nav-item active w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors text-primary bg-blue-50 font-medium"
          >
            <ChartLine className="mr-3" size={18} />
            Dashboard
          </a>
          <a 
            href="/settings"
            className="nav-item w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors text-gray-600 hover:text-primary hover:bg-blue-50"
          >
            <SettingsIcon className="mr-3" size={18} />
            Settings
          </a>
        </nav>
        
        {/* User Info */}
        <div className="border-t border-gray-200 px-4 py-4">
          <div className="flex items-center">
            <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="text-gray-600" size={20} />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">
                {user?.firstName} {user?.lastName}
              </p>
              <button 
                onClick={handleSignOut}
                className="text-xs text-gray-500 hover:text-red-600 flex items-center mt-1"
              >
                <LogOut className="mr-1" size={12} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthenticatedApp({ user }: { user: any }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <div className="ml-64">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/settings" component={Settings} />
          <Route path="/subscribe" component={Subscribe} />
          <Route path="/checkout" component={Checkout} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
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
