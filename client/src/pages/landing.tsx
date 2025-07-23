import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartLine, Shield, Info, TrendingUp, Zap, Globe } from "lucide-react";

export default function Landing() {
  const handleSignIn = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="h-16 w-16 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <ChartLine className="text-white" size={32} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">CryptoInvest Pro</h2>
          <p className="mt-2 text-gray-600">Smart cryptocurrency investment platform</p>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 text-green-600" size={20} />
                  Welcome Back
                </CardTitle>
                <CardDescription>
                  Sign in to access your crypto investment dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handleSignIn} className="w-full h-12">
                  Sign In to Your Account
                </Button>
                
                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    New to CryptoInvest Pro? Sign in to get started with account setup
                  </p>
                </div>

                <div className="border-t pt-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-600">Real-time Tracking</p>
                    </div>
                    <div>
                      <Shield className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-600">Bank-level Security</p>
                    </div>
                    <div>
                      <Zap className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-600">Lightning Fast</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="features">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Info className="mr-2 text-blue-600" size={20} />
                  Platform Features
                </CardTitle>
                <CardDescription>
                  Professional-grade cryptocurrency investment tools
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-sm">Real-Time Portfolio Tracking</p>
                      <p className="text-xs text-gray-500">Live updates from Gemini exchange</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-sm">Enterprise Security</p>
                      <p className="text-xs text-gray-500">Encrypted API credentials & secure storage</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Globe className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-sm">Multi-Currency Support</p>
                      <p className="text-xs text-gray-500">SGD investment tracking & analytics</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Zap className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="font-medium text-sm">Advanced Analytics</p>
                      <p className="text-xs text-gray-500">Daily P&L, returns tracking & insights</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button onClick={handleSignIn} className="w-full" variant="outline">
                    Get Started Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="text-center">
          <p className="text-sm text-gray-500">
            Secured with enterprise-grade encryption
          </p>
        </div>
      </div>
    </div>
  );
}