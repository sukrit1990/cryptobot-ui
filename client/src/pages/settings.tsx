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
  User as UserIcon
} from "lucide-react";





export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/auth/session"],
  });

  // Fetch account state from CryptoBot API
  const { data: accountState, isLoading: accountLoading } = useQuery({
    queryKey: ["/api/account/state"],
    enabled: !!user, // Only fetch when user is available
  });



  const form = useForm({
    resolver: zodResolver(updateUserSettingsSchema),
    defaultValues: {
      initialFunds: user?.initialFunds?.toString() || '10000',
      investmentActive: accountState?.state === 'A' || false,
      riskTolerance: user?.riskTolerance || 'moderate',
    },
  });

  // Update form when account state changes
  useEffect(() => {
    if (accountState) {
      form.setValue('investmentActive', accountState.state === 'A');
    }
  }, [accountState, form]);

  const settingsMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/settings", data);
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Your investment settings have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/session"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update settings.",
        variant: "destructive",
      });
    },
  });

  // Toggle automation mutation
  const toggleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/account/toggle");
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Automation toggled",
        description: `Automated investing is now ${data.new_state === 'A' ? 'active' : 'inactive'}.`,
      });
      // Refresh account state to get updated toggle position
      queryClient.invalidateQueries({ queryKey: ["/api/account/state"] });
    },
    onError: (error: any) => {
      toast({
        title: "Toggle failed",
        description: error.message || "Failed to toggle automation state.",
        variant: "destructive",
      });
      // Reset the toggle to previous state
      queryClient.invalidateQueries({ queryKey: ["/api/account/state"] });
    },
  });



  const onSubmit = (data: any) => {
    settingsMutation.mutate(data);
  };



  const handleSignOut = () => {
    window.location.href = "/api/logout";
  };

  if (userLoading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your investment preferences and account settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Investment Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <SettingsIcon className="mr-2" size={20} />
              Investment Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Investment Status */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Automated Investing</h4>
                    <p className="text-sm text-gray-600">AI-powered portfolio management</p>
                    {accountState && (
                      <div className="mt-2 flex items-center">
                        <div className={`h-2 w-2 rounded-full mr-2 ${
                          accountState.state === 'A' ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <span className={`text-xs ${
                          accountState.state === 'A' ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          Status: {accountState.state === 'A' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    )}
                    {accountLoading && (
                      <div className="mt-2 flex items-center">
                        <div className="h-2 w-2 rounded-full mr-2 bg-gray-300 animate-pulse" />
                        <span className="text-xs text-gray-400">Loading status...</span>
                      </div>
                    )}
                  </div>
                  <FormField
                    control={form.control}
                    name="investmentActive"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              // Call API to toggle the state
                              toggleMutation.mutate();
                            }}
                            disabled={accountLoading || toggleMutation.isPending}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Investment Amount Update */}
                <FormField
                  control={form.control}
                  name="initialFunds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Investment Amount (SGD)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-gray-500">S$</span>
                          <Input
                            type="number"
                            className="pl-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Risk Level */}
                <FormField
                  control={form.control}
                  name="riskTolerance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Risk Tolerance</FormLabel>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: 'conservative', label: 'Conservative', desc: 'Low Risk', color: 'text-green-600' },
                          { value: 'moderate', label: 'Moderate', desc: 'Medium Risk', color: 'text-blue-600' },
                          { value: 'aggressive', label: 'Aggressive', desc: 'High Risk', color: 'text-red-600' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => field.onChange(option.value)}
                            className={`p-3 text-center border rounded-lg transition-colors ${
                              field.value === option.value
                                ? 'border-primary bg-blue-50'
                                : 'border-gray-300 hover:border-primary hover:bg-blue-50'
                            }`}
                          >
                            <div className={`font-medium ${field.value === option.value ? 'text-primary' : option.color}`}>
                              {option.label}
                            </div>
                            <div className="text-xs text-gray-500">{option.desc}</div>
                          </button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  disabled={settingsMutation.isPending || accountLoading}
                  className="w-full"
                >
                  {settingsMutation.isPending ? "Updating..." : "Update Settings"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>



        {/* API Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Key className="mr-2" size={20} />
              API Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {user?.geminiApiKey ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <Shield className="text-green-600 mr-2" size={16} />
                    <span className="text-green-800 font-medium">Gemini API Connected</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">Your API credentials are configured and secure</p>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <Key className="text-yellow-600 mr-2" size={16} />
                    <span className="text-yellow-800 font-medium">API Not Configured</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">Please complete your account setup</p>
                </div>
              )}
              
              <Button 
                variant="outline" 
                className="w-full"
                disabled
              >
                <RefreshCw className="mr-2" size={16} />
                Test API Connection
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full text-red-600 border-red-300 hover:border-red-500 hover:bg-red-50"
                disabled
              >
                <Key className="mr-2" size={16} />
                Update API Credentials
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserIcon className="mr-2" size={20} />
              Account Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Current User</p>
                    <p className="text-sm text-gray-500">
                      {user?.firstName} {user?.lastName} • {user?.email}
                    </p>
                  </div>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full"
                disabled
              >
                <Lock className="mr-2" size={16} />
                Change Password
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                disabled
              >
                <Shield className="mr-2" size={16} />
                Two-Factor Authentication
              </Button>
              
              <Button 
                onClick={handleSignOut}
                variant="outline" 
                className="w-full text-red-600 border-red-300 hover:border-red-500 hover:bg-red-50"
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
