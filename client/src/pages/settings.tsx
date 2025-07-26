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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
import { Elements, useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_51RnfLYAU0aPHWB2SMsCnGHILlcH06tWUUMg98VEVbpJ8KezPduuM8Z38icXto6tn928MdqlnwFxJiycTmt81h0PD00lNOyG8Bs';
const stripePromise = loadStripe(STRIPE_PUBLIC_KEY);

function SubscriptionForm({ onClose }: { onClose: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error("Card element not found");
      }

      // Create payment method
      const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (error) {
        toast({
          title: "Payment method creation failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Step 1: Create customer
      const customerResponse = await apiRequest("POST", "/api/create-customer", {
        payment_method_id: paymentMethod.id,
      });

      if (!customerResponse.ok) {
        throw new Error("Failed to create customer");
      }

      const customerData = await customerResponse.json();

      // Step 2: Create subscription
      const subscriptionResponse = await apiRequest("POST", "/api/create-subscription", {
        customer_id: customerData.customer_id,
      });

      if (!subscriptionResponse.ok) {
        throw new Error("Failed to create subscription");
      }

      const subscriptionData = await subscriptionResponse.json();

      // Show trial end date if trial is active
      let description = `Your metered subscription is now active. Subscription ID: ${subscriptionData.subscription_id}`;
      if (subscriptionData.trial_ends_at) {
        const trialEnd = new Date(subscriptionData.trial_ends_at * 1000).toLocaleDateString();
        description = `Trial started! You will be charged starting on ${trialEnd}. Subscription ID: ${subscriptionData.subscription_id}`;
      }

      toast({
        title: "Subscription successful!",
        description,
      });

      // Refresh subscription status
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-status"] });
      onClose();

    } catch (error: any) {
      toast({
        title: "Subscription failed",
        description: error.message || "Failed to create subscription.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Information
        </label>
        <div className="p-3 border border-gray-300 rounded-md">
          <CardElement 
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
              },
            }}
          />
        </div>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || isProcessing}>
          {isProcessing ? "Processing..." : "Subscribe"}
        </Button>
      </div>
    </form>
  );
}





export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSubscriptionForm, setShowSubscriptionForm] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isEditingFunds, setIsEditingFunds] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/auth/session"],
  });

  // Fetch account state from CryptoBot API
  const { data: accountState, isLoading: accountLoading } = useQuery({
    queryKey: ["/api/account/state"],
    enabled: !!user, // Only fetch when user is available
  });

  // Fetch subscription status
  const { data: subscriptionStatus, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["/api/subscription-status"],
    enabled: !!user,
  });

  // Fetch current invested amount from CryptoBot API
  const { data: fundData, isLoading: fundLoading } = useQuery({
    queryKey: ["/api/account/fund"],
    enabled: !!user,
  });



  const form = useForm({
    resolver: zodResolver(updateUserSettingsSchema),
    defaultValues: {
      initialFunds: fundData?.fund?.toString() || user?.initialFunds?.toString() || '500',
      investmentActive: accountState?.state === 'A' || false,
    },
  });

  // Update form when account state or fund data changes
  useEffect(() => {
    if (accountState) {
      form.setValue('investmentActive', accountState.state === 'A');
    }
  }, [accountState, form]);

  useEffect(() => {
    if (fundData?.fund) {
      form.setValue('initialFunds', fundData.fund.toString());
    }
  }, [fundData, form]);

  const settingsMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/settings", data);
    },
    onSuccess: () => {
      toast({
        title: "Funds updated",
        description: "Your investment funds have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/session"] });
      queryClient.invalidateQueries({ queryKey: ["/api/account/fund"] });
      setIsEditingFunds(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update funds.",
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

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/cancel-subscription");
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Subscription cancelled",
        description: "Your subscription has been cancelled and automated investing is now inactive.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/account/state"] });
      setShowCancelDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation failed",
        description: error.message || "Failed to cancel subscription.",
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
      const response = await apiRequest("POST", "/api/change-password", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
      setShowChangePasswordDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Password change failed",
        description: error.message || "Failed to change password.",
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/account");
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });
      // Redirect to home page after deletion
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Deletion failed",
        description: error.message || "Failed to delete account.",
        variant: "destructive",
      });
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
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center">
                          <div className={`h-2 w-2 rounded-full mr-2 ${
                            accountState.state === 'A' ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                          <span className={`text-xs ${
                            accountState.state === 'A' ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            Status: {accountState.state === 'A' ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        {!subscriptionStatus?.hasSubscription && (
                          <div className="text-xs text-orange-600">
                            Subscription required to activate
                          </div>
                        )}
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
                              // Only allow activation if user has subscription
                              if (checked && !subscriptionStatus?.hasSubscription) {
                                toast({
                                  title: "Subscription required",
                                  description: "You need an active subscription to enable automated investment.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              field.onChange(checked);
                              // Call API to toggle the state
                              toggleMutation.mutate();
                            }}
                            disabled={accountLoading || toggleMutation.isPending || subscriptionLoading}
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
                      <FormLabel className="flex items-center justify-between">
                        <span>Invested Amount (SGD)</span>
                        {!isEditingFunds && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditingFunds(true)}
                            className="text-sm text-blue-600 hover:text-blue-700 h-auto p-1"
                          >
                            Edit
                          </Button>
                        )}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-gray-500">S$</span>
                          {isEditingFunds ? (
                            <div className="flex space-x-2">
                              <Input
                                type="number"
                                className="pl-10 flex-1"
                                {...field}
                                autoFocus
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setIsEditingFunds(false);
                                  // Reset to original value if user cancels
                                  if (fundData?.fund) {
                                    form.setValue('initialFunds', fundData.fund.toString());
                                  }
                                }}
                                className="px-3"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="pl-10 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900 min-h-[40px] flex items-center">
                              {fundLoading ? (
                                <div className="flex items-center">
                                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mr-2"></div>
                                  Loading...
                                </div>
                              ) : (
                                `${parseFloat(field.value || '0').toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              )}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />



                {isEditingFunds && (
                  <Button 
                    type="submit" 
                    disabled={settingsMutation.isPending || accountLoading || fundLoading}
                    className="w-full"
                  >
                    {settingsMutation.isPending ? "Updating..." : "Update Funds"}
                  </Button>
                )}
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

        {/* Payment & Subscription Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment & Subscription
            </CardTitle>
            <CardDescription>
              Manage your subscription for metered usage billing based on trading profits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscriptionLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <div className="space-y-4">
                {subscriptionStatus?.hasSubscription ? (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">Active Subscription</p>
                        <p className="text-sm text-green-700">
                          Metered billing enabled - you're charged based on trading profits
                        </p>
                        {subscriptionStatus?.trialEndsAt && (
                          <p className="text-sm text-blue-700 mt-1">
                            Free trial until {new Date(subscriptionStatus.trialEndsAt * 1000).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <p className="text-sm text-green-700">
                        Subscription ID: {subscriptionStatus.subscriptionId?.slice(-8)}
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowCancelDialog(true)}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        Cancel Subscription
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg bg-blue-50">
                      <h4 className="font-medium text-blue-900 mb-2">Metered Usage Plan</h4>
                      <p className="text-sm text-blue-700 mb-3">
                        Pay only for what you earn! Our metered billing charges you based on your actual trading profits.
                      </p>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• 30-day free trial period</li>
                        <li>• No fixed monthly fees</li>
                        <li>• Billing based on daily profits</li>
                        <li>• Transparent usage tracking</li>
                        <li>• Card payments only</li>
                      </ul>
                    </div>
                    
                    <Elements stripe={stripePromise}>
                      <Dialog open={showSubscriptionForm} onOpenChange={setShowSubscriptionForm}>
                        <DialogTrigger asChild>
                          <Button className="w-full">
                            <CreditCard className="mr-2 h-4 w-4" />
                            Subscribe Now
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Subscribe to Metered Plan</DialogTitle>
                            <DialogDescription>
                              Add your payment method to activate metered billing based on your trading profits.
                            </DialogDescription>
                          </DialogHeader>
                          <SubscriptionForm onClose={() => setShowSubscriptionForm(false)} />
                        </DialogContent>
                      </Dialog>
                    </Elements>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cancel Subscription Alert Dialog */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel your subscription? This will:
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>Cancel your current subscription at the end of the billing period</li>
                  <li>Turn off automated investing immediately</li>
                  <li>Stop all future billing</li>
                </ul>
                You can resubscribe at any time to reactivate these features.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => cancelSubscriptionMutation.mutate()}
                disabled={cancelSubscriptionMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {cancelSubscriptionMutation.isPending ? "Cancelling..." : "Cancel Subscription"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>



        {/* Legacy Account Security Card */}
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
                onClick={() => setShowChangePasswordDialog(true)}
              >
                <Lock className="mr-2" size={16} />
                Change Password
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

        {/* Account Management - Moved to bottom */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <UserIcon className="mr-2" size={20} />
              Account Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2">Delete Account</h4>
                <p className="text-sm text-red-700 mb-4">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <ul className="text-sm text-red-600 mb-4 space-y-1">
                  <li>• All portfolio data will be removed</li>
                  <li>• Active subscriptions will be cancelled</li>
                  <li>• Account will be removed from CryptoBot system</li>
                  <li>• You will be immediately signed out</li>
                </ul>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  className="w-full"
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={showChangePasswordDialog} onOpenChange={setShowChangePasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new password.
            </DialogDescription>
          </DialogHeader>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const currentPassword = formData.get('currentPassword') as string;
              const newPassword = formData.get('newPassword') as string;
              const confirmPassword = formData.get('confirmPassword') as string;
              
              if (newPassword !== confirmPassword) {
                toast({
                  title: "Passwords don't match",
                  description: "Please make sure both new password fields match.",
                  variant: "destructive",
                });
                return;
              }
              
              if (newPassword.length < 6) {
                toast({
                  title: "Password too short",
                  description: "Password must be at least 6 characters long.",
                  variant: "destructive",
                });
                return;
              }
              
              changePasswordMutation.mutate({ currentPassword, newPassword, confirmPassword });
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <Input
                name="currentPassword"
                type="password"
                required
                placeholder="Enter current password"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <Input
                name="newPassword"
                type="password"
                required
                placeholder="Enter new password"
                minLength={6}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <Input
                name="confirmPassword"
                type="password"
                required
                placeholder="Confirm new password"
                minLength={6}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowChangePasswordDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={changePasswordMutation.isPending}>
                {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3">
                <p><strong>This action is permanent and cannot be undone.</strong></p>
                <p>Deleting your account will:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Remove all your portfolio and investment data</li>
                  <li>Cancel any active subscriptions immediately</li>
                  <li>Delete your account from the CryptoBot trading system</li>
                  <li>Remove all stored API credentials and settings</li>
                  <li>Sign you out and prevent future access</li>
                </ul>
                <p className="text-red-600 font-medium">
                  Type "DELETE" below to confirm account deletion:
                </p>
                <Input
                  id="delete-confirmation"
                  placeholder="Type DELETE to confirm"
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Account</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                const input = document.getElementById('delete-confirmation') as HTMLInputElement;
                if (input?.value === 'DELETE') {
                  deleteAccountMutation.mutate();
                } else {
                  toast({
                    title: "Confirmation required",
                    description: "Please type 'DELETE' to confirm account deletion.",
                    variant: "destructive",
                  });
                }
              }}
              disabled={deleteAccountMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
