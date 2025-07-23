import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChartLine, Shield, Info } from "lucide-react";

export default function Landing() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(insertUserSchema.extend({
      initialFunds: insertUserSchema.shape.initialFunds.transform(val => val?.toString() || ''),
    })),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      geminiApiKey: '',
      geminiApiSecret: '',
      initialFunds: '10000',
    },
  });

  const setupMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/auth/setup", data);
    },
    onSuccess: () => {
      toast({
        title: "Account created successfully!",
        description: "Your crypto investment account is now ready.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: "Setup failed",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      setupMutation.mutate({
        ...data,
        initialFunds: parseFloat(data.initialFunds).toString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center">
            <ChartLine className="text-white text-2xl" size={32} />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">CryptoInvest Pro</h2>
          <p className="mt-2 text-sm text-gray-600">Intelligent crypto investment platform</p>
        </div>

        <Tabs defaultValue="signup" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
            <TabsTrigger value="signin">Sign In</TabsTrigger>
          </TabsList>

          <TabsContent value="signup" className="space-y-4">
            <Card className="shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Create Account</CardTitle>
                <CardDescription>Start your intelligent crypto investment journey</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                      <h4 className="font-medium text-blue-900 flex items-center">
                        <Shield className="mr-2" size={16} />
                        Gemini API Credentials
                      </h4>
                      
                      <FormField
                        control={form.control}
                        name="geminiApiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-blue-800 text-sm">API Key</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Enter your Gemini API key" 
                                className="border-blue-300 focus:ring-primary"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="geminiApiSecret"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-blue-800 text-sm">API Secret</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Enter your Gemini API secret" 
                                className="border-blue-300 focus:ring-primary"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <p className="text-xs text-blue-600 flex items-start">
                        <Info className="mr-1 mt-0.5" size={12} />
                        Your API credentials are encrypted and stored securely
                      </p>
                    </div>

                    <FormField
                      control={form.control}
                      name="initialFunds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Initial Investment (SGD)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-3 text-gray-500">S$</span>
                              <Input 
                                type="number" 
                                placeholder="10000" 
                                className="pl-10"
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <p className="text-xs text-gray-500">Minimum investment: S$1,000</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-blue-700 hover:to-blue-700"
                      disabled={isLoading || setupMutation.isPending}
                    >
                      {isLoading || setupMutation.isPending ? "Creating Account..." : "Create Account & Validate Credentials"}
                    </Button>
                  </form>
                </Form>

                <div className="mt-6 text-center">
                  <button 
                    onClick={() => document.querySelector('[data-state="inactive"]')?.click()}
                    className="text-primary hover:text-blue-600 font-medium"
                  >
                    Already have an account? Sign In
                  </button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signin" className="space-y-4">
            <Card className="shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Welcome Back</CardTitle>
                <CardDescription>Sign in to your investment dashboard</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Button 
                  onClick={handleSignIn}
                  className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-blue-700 hover:to-blue-700"
                >
                  Sign In to Dashboard
                </Button>

                <div className="text-center">
                  <button 
                    onClick={() => document.querySelector('[data-state="inactive"]')?.click()}
                    className="text-primary hover:text-blue-600 font-medium"
                  >
                    Don't have an account? Sign Up
                  </button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
