import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { adminLoginSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";

export default function AdminLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/admin/login", data);
    },
    onSuccess: () => {
      toast({
        title: "Admin logged in successfully!",
        description: "Welcome to the admin portal.",
      });
      // Reload to redirect to admin dashboard
      window.location.href = "/admin";
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      loginMutation.mutate(data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-4 sm:py-12 px-3 sm:px-6 lg:px-8 bg-gradient-to-br from-red-50 to-orange-100">
      <div className="max-w-md w-full space-y-4 sm:space-y-8">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 sm:h-16 sm:w-16 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl flex items-center justify-center">
            <Shield className="text-white" size={24} />
          </div>
          <h2 className="mt-4 sm:mt-6 text-2xl sm:text-3xl font-bold text-gray-900">Admin Portal</h2>
          <p className="mt-2 text-sm text-gray-600">Access administrative controls</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl sm:text-2xl">Admin Login</CardTitle>
            <CardDescription className="text-sm">Enter your admin credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="admin-login-form">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Admin username" 
                          data-testid="input-username"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Admin password" 
                          data-testid="input-password"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full bg-red-600 hover:bg-red-700"
                  disabled={isLoading || loginMutation.isPending}
                  data-testid="button-admin-login"
                >
                  {(isLoading || loginMutation.isPending) ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="text-center">
          <a 
            href="/" 
            className="text-sm text-gray-600 hover:text-gray-900 underline"
            data-testid="link-back-to-app"
          >
            ← Back to main application
          </a>
        </div>
      </div>
    </div>
  );
}