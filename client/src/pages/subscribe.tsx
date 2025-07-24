import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Check, 
  Star,
  Shield,
  Zap,
  TrendingUp,
  ArrowRight
} from "lucide-react";
import { Elements, useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_51RnfLYAU0aPHWB2SMsCnGHILlcH06tWUUMg98VEVbpJ8KezPduuM8Z38icXto6tn928MdqlnwFxJiycTmt81h0PD00lNOyG8Bs';
const stripePromise = loadStripe(STRIPE_PUBLIC_KEY);

function SubscriptionForm({ clientSecret, onClose }: { clientSecret: string; onClose: () => void }) {
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
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/dashboard',
        },
      });

      if (error) {
        toast({
          title: "Subscription failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Subscription successful",
          description: "Welcome to CryptoInvest Pro Premium!",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/subscription-status"] });
        onClose();
      }
    } catch (error: any) {
      toast({
        title: "Subscription failed",
        description: error.message || "Failed to process subscription.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Your Subscription</CardTitle>
        <CardDescription>
          Enter your payment details to activate CryptoInvest Pro Premium
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <PaymentElement />
          <div className="flex gap-4">
            <Button type="submit" disabled={!stripe || isProcessing} className="flex-1">
              {isProcessing ? "Processing..." : "Subscribe Now"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function Subscribe() {
  const { toast } = useToast();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [clientSecret, setClientSecret] = useState("");

  // Check current subscription status
  const { data: subscriptionStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/subscription-status"],
    retry: false,
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/create-subscription");
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.status === 'active') {
        toast({
          title: "Already subscribed",
          description: "You already have an active subscription.",
        });
        return;
      }
      
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setShowPaymentForm(true);
      } else {
        toast({
          title: "Subscription activated",
          description: "Your subscription is now active!",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Subscription failed",
        description: error.message || "Failed to create subscription.",
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = () => {
    createSubscriptionMutation.mutate();
  };

  if (statusLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  // If already subscribed, show status
  if (subscriptionStatus?.status === 'active') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-green-900">You're all set!</CardTitle>
              <CardDescription className="text-green-700">
                You have an active CryptoInvest Pro Premium subscription
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="space-y-4">
                <Badge variant="outline" className="border-green-600 text-green-600">
                  Premium Active
                </Badge>
                <p className="text-sm text-green-600">
                  Next billing: {new Date(subscriptionStatus.currentPeriodEnd * 1000).toLocaleDateString()}
                </p>
                <Button onClick={() => window.location.href = '/dashboard'} className="bg-green-600 hover:bg-green-700">
                  Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Upgrade to Premium
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Unlock advanced features and maximize your cryptocurrency investment potential
          </p>
        </div>

        {showPaymentForm && clientSecret ? (
          <div className="max-w-2xl mx-auto">
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <SubscriptionForm 
                clientSecret={clientSecret} 
                onClose={() => setShowPaymentForm(false)} 
              />
            </Elements>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Free Plan */}
            <Card className="relative">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                    <TrendingUp className="text-gray-600" size={20} />
                  </div>
                  Basic Plan
                </CardTitle>
                <CardDescription>Perfect for getting started</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold">Free</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    Basic portfolio tracking
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    Manual investment controls
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    Daily portfolio updates
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    Basic analytics
                  </li>
                </ul>
                <Button variant="outline" className="w-full" disabled>
                  Current Plan
                </Button>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card className="relative border-primary shadow-lg">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary">
                  <Star className="h-4 w-4 mr-1" />
                  Most Popular
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <div className="h-8 w-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center mr-3">
                    <Zap className="text-white" size={20} />
                  </div>
                  Premium Plan
                </CardTitle>
                <CardDescription>Advanced AI-powered investing</CardDescription>
                <div className="mt-4">
                  <span className="text-3xl font-bold">S$29</span>
                  <span className="text-gray-600 ml-2">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    Everything in Basic
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    AI-powered automated investing
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    Real-time market analysis
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    Advanced portfolio optimization
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    Risk management algorithms
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    Priority customer support
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    Detailed performance analytics
                  </li>
                </ul>
                <Button 
                  onClick={handleSubscribe}
                  disabled={createSubscriptionMutation.isPending}
                  className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
                >
                  {createSubscriptionMutation.isPending ? "Processing..." : "Start Premium Trial"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Security Note */}
        <div className="mt-12 max-w-2xl mx-auto">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start">
                <Shield className="text-blue-600 mt-1 mr-3" size={20} />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">Secure Payment Processing</h3>
                  <p className="text-sm text-blue-700">
                    All payments are processed securely through Stripe. Your payment information is encrypted and never stored on our servers. 
                    You can cancel or modify your subscription at any time.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}