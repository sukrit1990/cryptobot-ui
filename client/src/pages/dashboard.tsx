import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, RefreshCw } from "lucide-react";

interface PortfolioData {
  investedValue: number;
  currentValue: number;
  returns: number;
  returnsPercentage: number;
}

export default function Dashboard() {
  const [portfolio, setPortfolio] = useState<PortfolioData>({
    investedValue: 0,
    currentValue: 0,
    returns: 0,
    returnsPercentage: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  // This will be replaced with actual API call later
  const fetchPortfolioData = async () => {
    setIsLoading(true);
    try {
      // Placeholder for future external API integration
      // For now, show placeholder values indicating data will come from external API
      setPortfolio({
        investedValue: 0,
        currentValue: 0,
        returns: 0,
        returnsPercentage: 0
      });
    } catch (error) {
      console.error('Failed to fetch portfolio data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const handleSignOut = () => {
    // Clear session and redirect
    fetch('/api/signout', { method: 'POST' });
    window.location.reload();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: 'SGD'
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="text-white" size={20} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">CryptoInvest Pro</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome back!
              </span>
              <Button 
                onClick={handleSignOut}
                variant="outline"
                size="sm"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Portfolio Overview</h2>
          <p className="text-gray-600">Track your cryptocurrency investment performance</p>
        </div>

        {/* Portfolio Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Invested Value */}
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Invested
              </CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {portfolio.investedValue > 0 ? formatCurrency(portfolio.investedValue) : "Awaiting API data..."}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Initial investment amount
              </p>
            </CardContent>
          </Card>

          {/* Current Value */}
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Current Value
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {portfolio.currentValue > 0 ? formatCurrency(portfolio.currentValue) : "Awaiting API data..."}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Current portfolio value
              </p>
            </CardContent>
          </Card>

          {/* Returns */}
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Returns
              </CardTitle>
              {portfolio.returns >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${portfolio.returns >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {portfolio.returns !== 0 ? formatCurrency(portfolio.returns) : "Awaiting API data..."}
              </div>
              <p className={`text-xs mt-1 ${portfolio.returnsPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {portfolio.returnsPercentage !== 0 ? formatPercentage(portfolio.returnsPercentage) : "Pending calculation"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Data Status Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5" />
              <span>Portfolio Data</span>
            </CardTitle>
            <CardDescription>
              Portfolio values will be fetched from external backend API
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <p>• Investment data will be retrieved from external API</p>
                <p>• Real-time portfolio tracking coming soon</p>
                <p>• Daily returns calculation pending API integration</p>
              </div>
              <Button 
                onClick={fetchPortfolioData}
                disabled={isLoading}
                variant="outline"
                className="ml-4"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}