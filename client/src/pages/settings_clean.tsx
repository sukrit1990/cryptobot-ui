import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUserSettingsSchema, User } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings as SettingsIcon, 
  Shield, 
  RefreshCw, 
  Key,
  Lock,
  User as UserIcon,
  CreditCard,
  CheckCircle
} from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const handleSignOut = () => {
    window.location.href = "/api/logout";
  };

  if (userLoading) {
    return (
      <div className="p-4 sm:p-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="h-7 w-7 sm:h-8 sm:w-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center">
                <SettingsIcon className="text-white h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Settings</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Dashboard</span>
                <span className="sm:hidden">📊</span>
              </Button>
              <Button onClick={handleSignOut} variant="outline" size="sm" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Sign Out</span>
                <span className="sm:hidden">↗️</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
          {/* Basic Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base sm:text-lg">
                <UserIcon className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 text-sm sm:text-base">Current User</p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {user?.firstName} {user?.lastName} • {user?.email}
                      </p>
                    </div>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full text-xs sm:text-sm"
                >
                  <Lock className="mr-2 h-4 w-4" />
                  Change Password
                </Button>
                
                <Button 
                  onClick={handleSignOut}
                  variant="outline" 
                  className="w-full text-red-600 border-red-300 hover:border-red-500 hover:bg-red-50 text-xs sm:text-sm"
                >
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Investment Controls Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base sm:text-lg">
                <RefreshCw className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Investment Controls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-sm sm:text-base">Automated Investing</h4>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Automatically invest based on market analysis
                    </p>
                  </div>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-sm sm:text-base">Risk Management</h4>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Enable stop-loss and take-profit orders
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}