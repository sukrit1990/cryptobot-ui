import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, verifyOtpSchema, forgotPasswordSchema, resetPasswordSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChartLine, Shield, Info, Mail } from "lucide-react";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export default function Landing() {
  const [isLoading, setIsLoading] = useState(false);
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [userDataForVerification, setUserDataForVerification] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      geminiApiKey: '',
      geminiApiSecret: '',
      initialFunds: '500',
    },
  });

  const signInForm = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const otpForm = useForm({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: {
      email: '',
      code: '',
    },
    mode: 'onChange',
  });

  const forgotPasswordForm = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const resetPasswordForm = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: '',
      code: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Mutation to send OTP
  const sendOtpMutation = useMutation({
    mutationFn: async (email: string) => {
      await apiRequest("POST", "/api/send-otp", { email });
    },
    onSuccess: () => {
      toast({
        title: "Verification code sent!",
        description: "Please check your email for the 6-digit verification code.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send verification code",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation to verify OTP and complete registration
  const verifyOtpMutation = useMutation({
    mutationFn: async (data: { email: string; code: string; userData: any }) => {
      await apiRequest("POST", "/api/verify-otp", data);
    },
    onSuccess: () => {
      toast({
        title: "Account created successfully!",
        description: "Welcome to CryptoInvest Pro. Your account is now ready.",
      });
      // Invalidate all auth-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/session"] });
      
      // Small delay to ensure session is set on server, then reload
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
    onError: (error: any) => {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const setupMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/register", data);
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

  const signInMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/signin", data);
    },
    onSuccess: () => {
      toast({
        title: "Signed in successfully!",
        description: "Welcome back to your investment dashboard.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: "Sign in failed",
        description: error.message || "Invalid email or password.",
        variant: "destructive",
      });
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      await apiRequest("POST", "/api/forgot-password", { email });
    },
    onSuccess: () => {
      toast({
        title: "Reset code sent",
        description: "If an account with this email exists, you'll receive a password reset code.",
      });
      setShowResetPassword(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset code.",
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/reset-password", data);
    },
    onSuccess: () => {
      toast({
        title: "Password reset successfully",
        description: "You can now sign in with your new password.",
      });
      setShowForgotPassword(false);
      setShowResetPassword(false);
      resetPasswordForm.reset();
      forgotPasswordForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Reset failed",
        description: error.message || "Failed to reset password.",
        variant: "destructive",
      });
    },
  });

  // Updated onSubmit for two-step verification
  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      // Store user data for later verification
      setUserDataForVerification(data);
      
      // Set up standalone OTP states
      setOtpEmail(data.email);
      setOtpCode('');
      
      // Send OTP to user's email
      await sendOtpMutation.mutateAsync(data.email);
      
      // Show OTP verification screen
      setShowOtpVerification(true);
    } catch (error) {
      console.error('Failed to send OTP:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP verification
  const onVerifyOtp = async (otpData: { email: string; code: string }) => {
    setIsLoading(true);
    try {
      await verifyOtpMutation.mutateAsync({
        ...otpData,
        userData: userDataForVerification
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle standalone OTP form submission
  const onOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDataForVerification || !otpCode || otpCode.length !== 6) return;

    setIsLoading(true);
    try {
      await verifyOtpMutation.mutateAsync({
        email: otpEmail,
        code: otpCode,
        userData: userDataForVerification
      });
    } catch (error) {
      console.error('OTP verification failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSignIn = async (data: any) => {
    setIsLoading(true);
    try {
      signInMutation.mutate(data);
    } finally {
      setIsLoading(false);
    }
  };

  const onForgotPassword = async (data: any) => {
    setResetEmail(data.email);
    resetPasswordForm.setValue('email', data.email);
    forgotPasswordMutation.mutate(data.email);
  };

  const onResetPassword = async (data: any) => {
    resetPasswordMutation.mutate(data);
  };

  const handleSignIn = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-4 sm:py-12 px-3 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-4 sm:space-y-8">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 sm:h-16 sm:w-16 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center">
            <ChartLine className="text-white" size={24} />
          </div>
          <h2 className="mt-4 sm:mt-6 text-2xl sm:text-3xl font-bold text-gray-900">CryptoInvest Pro</h2>
          <p className="mt-2 text-sm text-gray-600">Your strategy. On autopilot.</p>
        </div>

        <Tabs defaultValue="signup" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
            <TabsTrigger value="signin">Sign In</TabsTrigger>
          </TabsList>

          <TabsContent value="signup" className="space-y-4">
            {!showOtpVerification ? (
              <Card className="shadow-lg">
                <CardHeader className="text-center">
                  <CardTitle className="text-xl sm:text-2xl">Create Account</CardTitle>
                  <CardDescription className="text-sm">Start your automated investment journey</CardDescription>
                </CardHeader>
                <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
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

                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter your password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Confirm your password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 space-y-3">
                      <h4 className="font-medium text-blue-900 flex items-center">
                        <Shield className="mr-2" size={16} />
                        Gemini API Credentials
                      </h4>
                      <p className="text-xs text-blue-700">
                        Need API credentials? <a 
                          href="/gemini-guide" 
                          className="underline hover:text-blue-900 font-medium"
                        >
                          Learn how to create Gemini API keys →
                        </a>
                      </p>
                      
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
                                placeholder="500" 
                                min="500"
                                className="pl-10"
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <div className="text-xs text-gray-600 mt-1 flex items-start">
                            <Info className="mr-1 mt-0.5" size={12} />
                            Minimum S$500. You can change this amount later in settings.
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-blue-700 hover:to-blue-700"
                      disabled={isLoading || sendOtpMutation.isPending}
                    >
                      {isLoading || sendOtpMutation.isPending ? "Sending Verification Code..." : "Send Verification Code"}
                    </Button>
                  </form>
                </Form>

                <div className="mt-6 text-center">
                  <button 
                    onClick={() => (document.querySelector('[data-state="inactive"]') as HTMLElement)?.click()}
                    className="text-primary hover:text-blue-600 font-medium"
                  >
                    Already have an account? Sign In
                  </button>
                </div>
              </CardContent>
            </Card>
            ) : (
              <Card className="shadow-lg">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl flex items-center justify-center">
                    <Mail className="mr-2" size={24} />
                    Verify Your Email
                  </CardTitle>
                  <CardDescription>
                    We've sent a 6-digit verification code to your email address
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={onOtpSubmit} className="space-y-4">
                    <div className="text-sm text-gray-600 mb-4">
                      Please enter the 6-digit verification code sent to your email:
                    </div>

                    <div>
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Email Address
                      </label>
                      <Input 
                        type="email" 
                        placeholder="your@email.com" 
                        disabled
                        className="bg-gray-50 mt-2"
                        value={otpEmail}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Verification Code  
                      </label>
                      <Input 
                        type="text" 
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        className="text-center text-lg font-mono tracking-widest mt-2"
                        value={otpCode}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                          console.log('Standalone code input changed to:', value);
                          setOtpCode(value);
                        }}
                        name="standalone-verification-code"
                        id="standalone-verification-code"  
                        autoFocus
                        autoComplete="off"
                      />
                    </div>

                    <div className="text-xs text-gray-600 flex items-start">
                      <Shield className="mr-1 mt-0.5" size={12} />
                      Code expires in 10 minutes for security
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-blue-700 hover:to-blue-700"
                      disabled={isLoading || verifyOtpMutation.isPending || otpCode.length !== 6}
                    >
                      {isLoading || verifyOtpMutation.isPending ? "Verifying..." : "Verify & Create Account"}
                    </Button>
                  </form>

                  <div className="mt-6 text-center">
                    <button 
                      onClick={() => {
                        setShowOtpVerification(false);
                        setUserDataForVerification(null);
                        setOtpCode('');
                        setOtpEmail('');
                      }}
                      className="text-primary hover:text-blue-600 font-medium"
                    >
                      ← Back to Registration
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="signin" className="space-y-4">
            <Card className="shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Welcome Back</CardTitle>
                <CardDescription>Sign in to your investment dashboard</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...signInForm}>
                  <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-4">
                    <FormField
                      control={signInForm.control}
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

                    <FormField
                      control={signInForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter your password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-blue-700 hover:to-blue-700"
                      disabled={isLoading || signInMutation.isPending}
                    >
                      {isLoading || signInMutation.isPending ? "Signing In..." : "Sign In"}
                    </Button>

                    <div className="text-center">
                      <button 
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-primary hover:text-blue-600 font-medium"
                      >
                        Forgot password?
                      </button>
                    </div>
                  </form>
                </Form>

                <div className="mt-6 text-center">
                  <button 
                    onClick={() => (document.querySelector('[data-state="inactive"]') as HTMLElement)?.click()}
                    className="text-primary hover:text-blue-600 font-medium"
                  >
                    Don't have an account? Sign Up
                  </button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Forgot Password Modal */}
        {showForgotPassword && !showResetPassword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Reset Password</CardTitle>
                <CardDescription>Enter your email to receive a reset code</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...forgotPasswordForm}>
                  <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPassword)} className="space-y-4">
                    <FormField
                      control={forgotPasswordForm.control}
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

                    <div className="flex space-x-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setShowForgotPassword(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-blue-700 hover:to-blue-700"
                        disabled={forgotPasswordMutation.isPending}
                      >
                        {forgotPasswordMutation.isPending ? "Sending..." : "Send Reset Code"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reset Password Modal */}
        {showForgotPassword && showResetPassword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Enter Reset Code</CardTitle>
                <CardDescription>Check your email for the 6-digit reset code</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...resetPasswordForm}>
                  <form onSubmit={resetPasswordForm.handleSubmit(onResetPassword)} className="space-y-4">
                    <FormField
                      control={resetPasswordForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" disabled {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={resetPasswordForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reset Code</FormLabel>
                          <FormControl>
                            <Input 
                              type="text" 
                              placeholder="Enter 6-digit code"
                              maxLength={6}
                              className="text-center text-lg font-mono tracking-widest"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={resetPasswordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter new password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={resetPasswordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Confirm new password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex space-x-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          setShowForgotPassword(false);
                          setShowResetPassword(false);
                          resetPasswordForm.reset();
                          forgotPasswordForm.reset();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-blue-700 hover:to-blue-700"
                        disabled={resetPasswordMutation.isPending}
                      >
                        {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
