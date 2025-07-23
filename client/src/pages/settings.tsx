import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUserSettingsSchema, User, PaymentMethod } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings as SettingsIcon, 
  CreditCard, 
  Shield, 
  RefreshCw, 
  Key,
  Plus,
  Trash2,
  Lock,
  User as UserIcon,
  ExternalLink
} from "lucide-react";
import { Elements, useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_51RnfLYAU0aPHWB2SMsCnGHILlcH06tWUUMg98VEVbpJ8KezPduuM8Z38icXto6tn928MdqlnwFxJiycTmt81h0PD00lNOyG8Bs';
const stripePromise = loadStripe(STRIPE_PUBLIC_KEY);

function PaymentMethodForm({ onClose }: { onClose: () => void }) {
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
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment method setup failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (setupIntent && setupIntent.payment_method) {
        // Save payment method to backend
        await apiRequest("POST", "/api/payment-methods", {
          paymentMethodId: setupIntent.payment_method,
        });

        toast({
          title: "Payment method added",
          description: "Your payment method has been added successfully.",
        });

        queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
        onClose();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add payment method.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || isProcessing}>
          {isProcessing ? "Processing..." : "Add Payment Method"}
        </Button>
      </div>
    </form>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/auth/session"],
  });

  // Fetch account state from CryptoBot API
  const { data: accountState, isLoading: accountLoading } = useQuery({
    queryKey: ["/api/account/state"],
    enabled: !!user, // Only fetch when user is available
  });

  const { data: paymentMethods = [], isLoading: paymentMethodsLoading } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/payment-methods"],
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
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update settings.",
        variant: "destructive",
      });
    },
  });

  const deletePaymentMethodMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/payment-methods/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Payment method removed",
        description: "Payment method has been removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
    },
    onError: (error: any) => {
      toast({
        title: "Remove failed",
        description: error.message || "Failed to remove payment method.",
        variant: "destructive",
      });
    },
  });

  const setupIntentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/payment-methods/setup-intent");
      return await response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
      setShowPaymentForm(true);
    },
    onError: (error: any) => {
      toast({
        title: "Setup failed",
        description: error.message || "Failed to setup payment method form.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    settingsMutation.mutate(data);
  };

  const handleAddPaymentMethod = () => {
    setupIntentMutation.mutate();
  };

  const handleDeletePaymentMethod = (id: number) => {
    if (confirm("Are you sure you want to remove this payment method?")) {
      deletePaymentMethodMutation.mutate(id);
    }
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
                            onCheckedChange={field.onChange}
                            disabled={accountLoading}
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

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="mr-2" size={20} />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Current Payment Methods */}
            <div className="space-y-4 mb-6">
              {paymentMethodsLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : paymentMethods.length > 0 ? (
                paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <CreditCard className="text-primary" size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {method.brand?.charAt(0).toUpperCase() + method.brand?.slice(1)} ending in {method.last4}
                        </p>
                        <p className="text-sm text-gray-500">
                          Expires {method.expiryMonth}/{method.expiryYear}
                          {method.isDefault && <Badge className="ml-2" variant="secondary">Default</Badge>}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePaymentMethod(method.id)}
                      disabled={deletePaymentMethodMutation.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No payment methods added yet</p>
              )}
            </div>

            {/* Add Payment Method */}
            {showPaymentForm && clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <PaymentMethodForm onClose={() => setShowPaymentForm(false)} />
              </Elements>
            ) : (
              <Button 
                onClick={handleAddPaymentMethod}
                disabled={setupIntentMutation.isPending}
                variant="outline"
                className="w-full p-4 border-2 border-dashed border-gray-300 hover:border-primary hover:bg-blue-50"
              >
                <Plus className="mr-2" size={20} />
                {setupIntentMutation.isPending ? "Setting up..." : "Add Payment Method"}
              </Button>
            )}
            
            {/* Billing Portal Link */}
            <div className="border-t pt-4 mt-6">
              <a
                href="https://billing.stripe.com/p/login/test_14A5kC2Kt93E0vv2dx4F200"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center mr-3">
                    <CreditCard className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Manage Billing</p>
                    <p className="text-sm text-gray-500">View invoices, update billing info, and manage subscriptions</p>
                  </div>
                </div>
                <ExternalLink className="text-gray-400" size={18} />
              </a>
            </div>
            
            {/* Security Note */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <Shield className="text-blue-600 mt-0.5 mr-2" size={16} />
                <div>
                  <p className="text-sm font-medium text-blue-900">Secure Payment Processing</p>
                  <p className="text-xs text-blue-700">All payment information is processed securely through Stripe</p>
                </div>
              </div>
            </div>
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
