import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from "@tanstack/react-query";

interface PortfolioData {
  investedValue: number;
  currentValue: number;
  returns: number;
  returnsPercentage: number;
}

interface HistoryDataPoint {
  date: string;
  value: number;
  timestamp: string;
}

export default function Dashboard() {
  const [portfolio, setPortfolio] = useState<PortfolioData>({
    investedValue: 0,
    currentValue: 0,
    returns: 0,
    returnsPercentage: 0
  });

  // Fetch portfolio history from CryptoBot API
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['/api/portfolio/history'],
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Process the history data and calculate current portfolio metrics
  useEffect(() => {
    if (historyData && Array.isArray(historyData) && historyData.length > 0) {
      const latestData = historyData[historyData.length - 1];
      
      // Calculate portfolio metrics from history data
      const investedValue = latestData?.invested || 0;
      const currentValue = latestData?.current || 0;
      const returns = currentValue - investedValue;
      const returnsPercentage = investedValue > 0 ? (returns / investedValue) * 100 : 0;

      setPortfolio({
        investedValue,
        currentValue,
        returns,
        returnsPercentage
      });
    }
  }, [historyData]);

  const handleSignOut = () => {
    // Clear session and redirect
    fetch('/api/signout', { method: 'POST' });
    window.location.reload();
  };

  const handleRefresh = () => {
    refetchHistory();
  };

  // Format data for the chart
  const chartData = historyData?.map((point: any) => ({
    date: new Date(point.timestamp || point.date).toLocaleDateString(),
    value: point.value,
    timestamp: point.timestamp || point.date
  })) || [];

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

        {/* Portfolio Performance Chart */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <span>Portfolio Performance</span>
              </div>
              <Button 
                onClick={handleRefresh}
                disabled={historyLoading}
                variant="outline"
                size="sm"
              >
                {historyLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </>
                )}
              </Button>
            </CardTitle>
            <CardDescription>
              Track your investment value over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
                  <p className="text-gray-500">Loading portfolio data...</p>
                </div>
              </div>
            ) : chartData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      stroke="#6B7280"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      stroke="#6B7280"
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(value), 'Portfolio Value']}
                      labelStyle={{ color: '#374151' }}
                      contentStyle={{ 
                        backgroundColor: '#F9FAFB', 
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#2563EB" 
                      strokeWidth={3}
                      dot={{ fill: '#2563EB', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#2563EB', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 text-lg font-medium">No portfolio data available</p>
                  <p className="text-gray-400 text-sm mt-2">Your investment history will appear here once data is available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}