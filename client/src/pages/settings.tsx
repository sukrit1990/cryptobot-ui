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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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

const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_live_51RnfLYAU0aPHWB2SOWvibYhS7ByCZ3AD3byWOsgDPEnkUOPeEqCJAkCDOQlarINjK99pRLOabaZaLxvY08hSW9Ju00kUc2razq';
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

      toast({
        title: "Subscription successful!",
        description: `Your metered subscription is now active. Subscription ID: ${subscriptionData.subscription_id}`,
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
          {isProcessing ? "Processing..." : "Start Subscription"}
        </Button>
      </div>
    </form>
  );
}

function UpdateCardForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
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
      const { error: methodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (methodError) {
        throw new Error(methodError.message);
      }

      // Update payment method on backend
      const response = await apiRequest("POST", "/api/update-payment-method", {
        paymentMethodId: paymentMethod.id,
      });

      const data = await response.json();
      
      toast({
        title: "Card updated successfully",
        description: "Your payment method has been updated.",
      });

      onSuccess();

    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update payment method.",
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
          New Card Information
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
          {isProcessing ? "Updating..." : "Update Card"}
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
  const [showUpdateCardDialog, setShowUpdateCardDialog] = useState(false);

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/auth/session"],
  });

  // Fetch account state from CryptoBot API
  const { data: accountState, isLoading: accountLoading } = useQuery<{state: string}>({
    queryKey: ["/api/account/state"],
    enabled: !!user, // Only fetch when user is available
  });

  // Fetch subscription status
  const { data: subscriptionStatus, isLoading: subscriptionLoading } = useQuery<{
    hasSubscription: boolean;
    hasPaymentMethod: boolean;
    card?: {
      brand: string;
      last4: string;
    };
    trialEndsAt?: string;
  }>({
    queryKey: ["/api/subscription-status"],
    enabled: !!user,
  });

  // Fetch payment method details
  const { data: paymentMethod } = useQuery<{
    hasPaymentMethod: boolean;
    card?: {
      brand: string;
      last4: string;
    };
  }>({
    queryKey: ["/api/payment-method"],
    enabled: !!user && !!subscriptionStatus?.hasSubscription,
  });

  // Fetch current invested amount from CryptoBot API
  const { data: fundData, isLoading: fundLoading } = useQuery<{fund: number}>({
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

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/delete-account");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete account");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted. Redirecting to home page...",
      });
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete account. Please try again.",
        variant: "destructive",
      });
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
        description: "Your subscription has been cancelled and automated investing has been turned off.",
      });
      // Refresh both subscription status and account state
      queryClient.invalidateQueries({ queryKey: ["/api/subscription-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/account/state"] });
      setShowCancelDialog(false);
      // Update form to reflect inactive state
      form.setValue('investmentActive', false);
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

  const onSubmit = (data: any) => {
    settingsMutation.mutate(data);
  };

  const handleSignOut = async () => {
    try {
      window.location.href = "/api/logout";
    } catch (error) {
      console.error("Sign out failed:", error);
      window.location.href = "/";
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-3 sm:px-4">
        <div className="text-center">
          <div className="animate-spin w-6 h-6 sm:w-8 sm:h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="h-6 w-6 sm:h-8 sm:w-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center">
                <SettingsIcon className="text-white" size={14} />
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

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-8">
          {/* Investment Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base sm:text-lg">
                <SettingsIcon className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Investment Controls
              </CardTitle>
            </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                {/* Investment Status */}
                <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm sm:text-base">Automated Investing</h4>
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
                        <span className="text-sm sm:text-base">Invested Amount (SGD)</span>
                        {!isEditingFunds && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditingFunds(true)}
                            className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 h-auto p-1"
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
                      <p className="text-xs text-gray-500 mt-2">
                        Please ensure this amount is available as SGD in your Gemini account for automated investing to function properly.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isEditingFunds && (
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={settingsMutation.isPending}
                      className="text-xs sm:text-sm"
                    >
                      {settingsMutation.isPending ? "Updating..." : "Update Amount"}
                    </Button>
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
          </Card>

          {/* Subscription Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base sm:text-lg">
                <CreditCard className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Subscription & Billing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subscriptionLoading ? (
                  <div className="text-center py-4">
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-xs text-gray-500">Loading subscription status...</p>
                  </div>
                ) : subscriptionStatus?.hasSubscription ? (
                  <>
                    <div className="flex items-center p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="text-green-600 mr-3" size={20} />
                      <div>
                        <p className="font-medium text-green-800 text-sm sm:text-base">Active Subscription</p>
                        <p className="text-xs sm:text-sm text-green-600">
                          {subscriptionStatus.trialEndsAt ? (
                            <>Trial ends on {new Date(subscriptionStatus.trialEndsAt * 1000).toLocaleDateString()}</>
                          ) : (
                            "Metered billing is active"
                          )}
                        </p>
                      </div>
                    </div>
                    
                    {paymentMethod?.hasPaymentMethod && paymentMethod.card && (
                      <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">Payment Method</h4>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <CreditCard className="text-gray-400 mr-2" size={16} />
                            <span className="text-xs sm:text-sm">
                              {paymentMethod.card.brand.toUpperCase()} ending in {paymentMethod.card.last4}
                            </span>
                          </div>
                          <Dialog open={showUpdateCardDialog} onOpenChange={setShowUpdateCardDialog}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-xs">
                                Update
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Update Payment Method</DialogTitle>
                                <DialogDescription>
                                  Add a new card to replace your current payment method.
                                </DialogDescription>
                              </DialogHeader>
                              <Elements stripe={stripePromise}>
                                <UpdateCardForm 
                                  onClose={() => setShowUpdateCardDialog(false)}
                                  onSuccess={() => {
                                    setShowUpdateCardDialog(false);
                                    queryClient.invalidateQueries({ queryKey: ["/api/payment-method"] });
                                  }}
                                />
                              </Elements>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    )}
                    
                    <Button 
                      variant="destructive" 
                      className="w-full text-xs sm:text-sm"
                      onClick={() => setShowCancelDialog(true)}
                    >
                      Cancel Subscription
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <Shield className="mx-auto text-yellow-600 mb-2" size={24} />
                      <p className="font-medium text-yellow-800 text-sm sm:text-base">No Active Subscription</p>
                      <p className="text-xs sm:text-sm text-yellow-600 mt-1">
                        Subscribe to activate automated investing features
                      </p>
                    </div>
                    
                    <Dialog open={showSubscriptionForm} onOpenChange={setShowSubscriptionForm}>
                      <DialogTrigger asChild>
                        <Button className="w-full text-xs sm:text-sm">
                          Start Subscription
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Start Your Subscription</DialogTitle>
                          <DialogDescription>
                            Subscribe to CryptoInvest Pro to enable automated investing. 
                            Billing is based on your monthly trading profits.
                          </DialogDescription>
                        </DialogHeader>
                        <Elements stripe={stripePromise}>
                          <SubscriptionForm onClose={() => setShowSubscriptionForm(false)} />
                        </Elements>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Account Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base sm:text-lg">
                <UserIcon className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 text-sm sm:text-base">Current User</p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {user?.firstName} {user?.lastName} • {user?.email}
                      </p>
                    </div>
                  </div>
                </div>
                
                <Dialog open={showChangePasswordDialog} onOpenChange={setShowChangePasswordDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full text-xs sm:text-sm"
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      Change Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                      <DialogDescription>
                        Enter your current password and choose a new one.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target as HTMLFormElement);
                      const data = {
                        currentPassword: formData.get('currentPassword') as string,
                        newPassword: formData.get('newPassword') as string,
                        confirmPassword: formData.get('confirmPassword') as string,
                      };
                      
                      if (data.newPassword !== data.confirmPassword) {
                        toast({
                          title: "Password mismatch",
                          description: "New passwords do not match.",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      changePasswordMutation.mutate(data);
                    }} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Current Password
                        </label>
                        <Input type="password" name="currentPassword" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          New Password
                        </label>
                        <Input type="password" name="newPassword" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confirm New Password
                        </label>
                        <Input type="password" name="confirmPassword" required />
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

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base sm:text-lg">
                <Shield className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Security & Privacy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="text-green-600 mr-3" size={20} />
                    <div>
                      <p className="font-medium text-green-800 text-sm sm:text-base">API Credentials Secured</p>
                      <p className="text-xs sm:text-sm text-green-600">
                        Your Gemini API credentials are encrypted and stored securely
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Management */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center text-base sm:text-lg text-red-700">
                <Shield className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Account Management
              </CardTitle>
              <CardDescription className="text-red-600">
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-3 sm:p-4 border border-red-200 rounded-lg bg-red-50">
                <h4 className="font-medium text-red-800 mb-2 text-sm sm:text-base">Delete Account</h4>
                <p className="text-xs sm:text-sm text-red-600 mb-4">
                  Once you delete your account, there is no going back. This will permanently delete your account,
                  cancel your subscription, and remove all your data.
                </p>
                
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      className="text-xs sm:text-sm"
                    >
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your account
                        and remove all your data from our servers. Your subscription will also be cancelled.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          setShowDeleteDialog(false);
                          deleteAccountMutation.mutate();
                        }}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={deleteAccountMutation.isPending}
                      >
                        {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription? This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Turn off automated investing immediately</li>
                <li>Cancel your recurring subscription</li>
                <li>You can reactivate anytime by subscribing again</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelSubscriptionMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
              disabled={cancelSubscriptionMutation.isPending}
            >
              {cancelSubscriptionMutation.isPending ? "Cancelling..." : "Cancel Subscription"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}