import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartLine, Shield, TrendingUp, Users } from "lucide-react";

export default function Landing() {
  const handleSignIn = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="h-20 w-20 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-6">
            <ChartLine className="text-white" size={40} />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">CryptoInvest Pro</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Professional cryptocurrency investment platform with real-time portfolio tracking and advanced analytics
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center">
            <CardHeader>
              <TrendingUp className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <CardTitle>Real-Time Tracking</CardTitle>
              <CardDescription>
                Monitor your crypto portfolio with live updates from Gemini exchange
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="text-center">
            <CardHeader>
              <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Secure & Encrypted</CardTitle>
              <CardDescription>
                Enterprise-grade security with encrypted API credentials
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="text-center">
            <CardHeader>
              <Users className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>Professional Tools</CardTitle>
              <CardDescription>
                Advanced analytics and investment management features
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle>Start Your Investment Journey</CardTitle>
              <CardDescription>
                Join thousands of investors using our platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleSignIn} className="w-full h-12 text-lg">
                Sign In to Get Started
              </Button>
              <p className="text-center text-sm text-gray-500 mt-4">
                Secure authentication powered by Replit
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}