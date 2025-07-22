import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChartLine, Shield, Info } from "lucide-react";

export default function Setup() {
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
        title: "Account setup completed!",
        description: "Your crypto investment account is now ready.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Setup failed",
        description: error.message || "Failed to complete setup. Please try again.",
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

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="h-16 w-16 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <ChartLine className="text-white" size={32} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Complete Your Setup</h2>
          <p className="mt-2 text-gray-600">Configure your crypto investment account</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 text-green-600" size={20} />
              Account Configuration
            </CardTitle>
            <CardDescription>
              Enter your details and Gemini API credentials to start investing
            </CardDescription>
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border rounded-lg p-4 bg-blue-50">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                    <Info className="mr-2 text-blue-600" size={16} />
                    Gemini API Credentials
                  </h3>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="geminiApiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Key</FormLabel>
                          <FormControl>
                            <Input placeholder="Your Gemini API Key" {...field} />
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
                          <FormLabel>API Secret</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Your Gemini API Secret" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="initialFunds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Investment Amount (SGD)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="10000" min="1000" {...field} />
                      </FormControl>
                      <p className="text-sm text-gray-500">Minimum investment: S$1,000</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || setupMutation.isPending}
                >
                  {isLoading || setupMutation.isPending ? "Setting up..." : "Complete Setup"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-500">
            Your API credentials are encrypted and stored securely
          </p>
        </div>
      </div>
    </div>
  );
}