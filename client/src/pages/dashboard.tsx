import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, RefreshCw, PiggyBank } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
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

interface ProfitDataPoint {
  ID: string;
  DATE: string;
  PROFIT: number;
}

interface ProfitData {
  user_id: string;
  profit: ProfitDataPoint[];
}

export default function Dashboard() {
  const [portfolio, setPortfolio] = useState<PortfolioData>({
    investedValue: 0,
    currentValue: 0,
    returns: 0,
    returnsPercentage: 0
  });

  const [portfolioTimeView, setPortfolioTimeView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [profitTimeView, setProfitTimeView] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Fetch portfolio history from CryptoBot API
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['/api/portfolio/history'],
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Fetch profit data from CryptoBot API
  const { data: profitData, isLoading: profitLoading, refetch: refetchProfit } = useQuery<ProfitData>({
    queryKey: ['/api/profit'],
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

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/signout', { method: 'POST' });
      const result = await response.json();
      
      if (response.ok) {
        // Redirect to landing page
        window.location.href = '/';
      } else {
        console.error("Sign out failed:", result.message);
        // Force redirect anyway
        window.location.href = '/';
      }
    } catch (error) {
      console.error("Sign out error:", error);
      // Force redirect on error
      window.location.href = '/';
    }
  };

  const handleRefresh = () => {
    refetchHistory();
    refetchProfit();
  };

  // Helper function to aggregate data by time period
  const aggregateDataByPeriod = (data: any[], timeView: 'daily' | 'weekly' | 'monthly') => {
    if (!data || data.length === 0) return [];
    
    // Sort data by date first
    const sortedData = [...data].sort((a, b) => {
      const dateA = new Date(a.timestamp || a.date || a.DATE);
      const dateB = new Date(b.timestamp || b.date || b.DATE);
      return dateA.getTime() - dateB.getTime();
    });

    if (timeView === 'daily') {
      return sortedData;
    }

    const aggregated: { [key: string]: any } = {};

    sortedData.forEach((point: any) => {
      const date = new Date(point.timestamp || point.date || point.DATE);
      let periodKey: string;

      if (timeView === 'weekly') {
        // Get the start of the week (Sunday)
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        periodKey = startOfWeek.toISOString().split('T')[0];
      } else if (timeView === 'monthly') {
        // Get the start of the month
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
      } else {
        periodKey = date.toISOString().split('T')[0];
      }

      // For portfolio data, take the latest value in the period
      // For profit data, take the latest cumulative value in the period
      if (!aggregated[periodKey] || new Date(point.timestamp || point.date || point.DATE) > new Date(aggregated[periodKey].timestamp || aggregated[periodKey].date || aggregated[periodKey].DATE)) {
        aggregated[periodKey] = { ...point };
      }
    });

    return Object.values(aggregated);
  };

  // Format data for the portfolio chart
  const chartData = Array.isArray(historyData) && historyData.length > 0 
    ? aggregateDataByPeriod(historyData, portfolioTimeView).map((point: any) => ({
        date: new Date(point.timestamp || point.date).toLocaleDateString(),
        invested: point.invested || 0,
        current: point.current || point.value || 0,
        timestamp: point.timestamp || point.date
      })) 
    : [];

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
          <div className="flex justify-between items-center py-3 sm:py-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="h-7 w-7 sm:h-8 sm:w-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="text-white" size={16} />
              </div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">CryptoInvest Pro</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="hidden sm:inline text-sm text-gray-600">
                Welcome back!
              </span>
              <Button 
                onClick={() => window.location.href = '/settings'}
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Settings</span>
                <span className="sm:hidden">⚙️</span>
              </Button>
              <Button 
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Sign Out</span>
                <span className="sm:hidden">↗️</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-8">
        {/* Tabs */}
        <Tabs defaultValue="portfolio" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-8">
            <TabsTrigger value="portfolio" className="flex items-center text-xs sm:text-sm">
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Portfolio Performance</span>
              <span className="sm:hidden">Portfolio</span>
            </TabsTrigger>
            <TabsTrigger value="profit" className="flex items-center text-xs sm:text-sm">
              <PiggyBank className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Realized Profit</span>
              <span className="sm:hidden">Profit</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio">
            <div className="mb-4 sm:mb-8">
              <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2">Portfolio Overview</h2>
              <p className="text-sm sm:text-base text-gray-600">Track your cryptocurrency investment performance</p>
            </div>

        {/* Portfolio Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-8">
          {/* Invested Value */}
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Invested
              </CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-gray-900">
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
              <div className="text-lg sm:text-2xl font-bold text-gray-900">
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
              <div className={`text-lg sm:text-2xl font-bold ${portfolio.returns >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {portfolio.returns !== 0 ? formatCurrency(portfolio.returns) : "Awaiting API data..."}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Absolute profit/loss
              </p>
            </CardContent>
          </Card>

          {/* Return Percentage */}
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Return %
              </CardTitle>
              {portfolio.returnsPercentage >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-lg sm:text-2xl font-bold ${portfolio.returnsPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {portfolio.returnsPercentage !== 0 ? formatPercentage(portfolio.returnsPercentage) : "Awaiting API data..."}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Percentage return
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Portfolio Performance Chart */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                <span className="text-sm sm:text-base">Portfolio Performance</span>
              </div>
              <div className="flex items-center space-x-2">
                <Select value={portfolioTimeView} onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setPortfolioTimeView(value)}>
                  <SelectTrigger className="w-20 sm:w-32 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleRefresh}
                  disabled={historyLoading}
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm"
                >
                  {historyLoading ? (
                    <>
                      <RefreshCw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      <span className="hidden sm:inline">Loading...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Refresh</span>
                    </>
                  )}
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Compare your invested amount vs current portfolio value over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="h-48 sm:h-80 flex items-center justify-center">
                <div className="text-center">
                  <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto mb-2 text-blue-600" />
                  <p className="text-sm sm:text-base text-gray-500">Loading portfolio data...</p>
                </div>
              </div>
            ) : chartData.length > 0 ? (
              <div className="h-48 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="investedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="currentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid 
                      strokeDasharray="2 2" 
                      stroke="#E5E7EB" 
                      opacity={0.6}
                    />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11, fill: '#6B7280' }}
                      stroke="#9CA3AF"
                      tickLine={{ stroke: '#D1D5DB' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: '#6B7280' }}
                      stroke="#9CA3AF"
                      tickLine={{ stroke: '#D1D5DB' }}
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        formatCurrency(value), 
                        name === 'invested' ? '💰 Invested Amount' : '📈 Current Value'
                      ]}
                      labelStyle={{ color: '#374151', fontWeight: '600' }}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        border: '1px solid #E5E7EB',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="line"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="invested" 
                      stroke="#F59E0B" 
                      strokeWidth={3}
                      strokeDasharray="8 4"
                      dot={{ 
                        fill: '#F59E0B', 
                        strokeWidth: 2, 
                        r: 4,
                        stroke: '#FFFFFF'
                      }}
                      activeDot={{ 
                        r: 7, 
                        stroke: '#F59E0B', 
                        strokeWidth: 3,
                        fill: '#FFFFFF'
                      }}
                      name="Invested Amount"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="current" 
                      stroke="#10B981" 
                      strokeWidth={4}
                      dot={{ 
                        fill: '#10B981', 
                        strokeWidth: 2, 
                        r: 5,
                        stroke: '#FFFFFF'
                      }}
                      activeDot={{ 
                        r: 8, 
                        stroke: '#10B981', 
                        strokeWidth: 3,
                        fill: '#FFFFFF'
                      }}
                      name="Current Value"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 sm:h-80 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 text-base sm:text-lg font-medium">No portfolio data available</p>
                  <p className="text-gray-400 text-xs sm:text-sm mt-2">Portfolio data will appear once your automated investment starts generating history</p>
                  <p className="text-gray-400 text-xs mt-1">Enable automated investing in Settings to begin tracking performance</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="profit">
            <div className="mb-4 sm:mb-8">
              <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2">Realized Profit</h2>
              <p className="text-sm sm:text-base text-gray-600">Track your cryptocurrency trading profits over time</p>
            </div>

            {/* Profit Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-8">
              {/* Total Profit */}
              <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Realized Profit
                  </CardTitle>
                  <PiggyBank className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-2xl font-bold text-gray-900">
                    {(() => {
                      if (profitData && profitData.profit?.length > 0) {
                        // Sort profit data by date first to get the actual latest entry
                        const sortedProfitData = [...profitData.profit].sort((a, b) => {
                          const dateA = new Date(a.DATE);
                          const dateB = new Date(b.DATE);
                          return dateA.getTime() - dateB.getTime();
                        });
                        const latestProfitEntry = sortedProfitData[sortedProfitData.length - 1];
                        return formatCurrency(parseFloat(latestProfitEntry?.PROFIT || 0));
                      }
                      return "No profit data";
                    })()}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {(() => {
                      if (profitData && profitData.profit?.length > 0) {
                        // Get the latest date after sorting
                        const sortedProfitData = [...profitData.profit].sort((a, b) => {
                          const dateA = new Date(a.DATE);
                          const dateB = new Date(b.DATE);
                          return dateA.getTime() - dateB.getTime();
                        });
                        const latestDate = sortedProfitData[sortedProfitData.length - 1]?.DATE;
                        return `As of ${latestDate}`;
                      }
                      return "Total realized profits";
                    })()}
                  </p>
                </CardContent>
              </Card>

              {/* Latest Profit */}
              <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Latest Day Profit
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-gray-900">
                    {(() => {
                      if (profitData && profitData.profit?.length > 0) {
                        // Sort profit data by date first to get accurate latest entry
                        const sortedProfitData = [...profitData.profit].sort((a, b) => {
                          const dateA = new Date(a.DATE);
                          const dateB = new Date(b.DATE);
                          return dateA.getTime() - dateB.getTime();
                        });
                        
                        const latestIndex = sortedProfitData.length - 1;
                        const currentProfit = parseFloat(sortedProfitData[latestIndex]?.PROFIT || 0);
                        const previousProfit = latestIndex > 0 ? parseFloat(sortedProfitData[latestIndex - 1]?.PROFIT || 0) : 0;
                        const dailyIncrement = currentProfit - previousProfit;
                        return formatCurrency(dailyIncrement);
                      }
                      return "No data";
                    })()}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {(() => {
                      if (profitData && profitData.profit?.length > 0) {
                        // Get the latest date after sorting
                        const sortedProfitData = [...profitData.profit].sort((a, b) => {
                          const dateA = new Date(a.DATE);
                          const dateB = new Date(b.DATE);
                          return dateA.getTime() - dateB.getTime();
                        });
                        const latestDate = sortedProfitData[sortedProfitData.length - 1]?.DATE;
                        return `On ${latestDate}`;
                      }
                      return "Latest profit information";
                    })()}
                  </p>
                </CardContent>
              </Card>

              {/* Realized Profit % */}
              <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Realized Profit %
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {(() => {
                      if (profitData && profitData.profit?.length > 0 && portfolio.investedValue > 0) {
                        // Sort profit data by date first to get accurate latest entry
                        const sortedProfitData = [...profitData.profit].sort((a, b) => {
                          const dateA = new Date(a.DATE);
                          const dateB = new Date(b.DATE);
                          return dateA.getTime() - dateB.getTime();
                        });
                        const latestProfit = parseFloat(sortedProfitData[sortedProfitData.length - 1]?.PROFIT || 0);
                        const profitPercentage = (latestProfit / portfolio.investedValue) * 100;
                        return `${profitPercentage >= 0 ? '+' : ''}${profitPercentage.toFixed(2)}%`;
                      }
                      return "Calculating...";
                    })()}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    As % of invested amount
                  </p>
                </CardContent>
              </Card>

              {/* IRR */}
              <Card className="shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Annualized IRR
                  </CardTitle>
                  <BarChart3 className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {(() => {
                      if (profitData && profitData.profit?.length > 0 && portfolio.investedValue > 0) {
                        // Sort profit data by date first to get accurate latest entry
                        const sortedProfitData = [...profitData.profit].sort((a, b) => {
                          const dateA = new Date(a.DATE);
                          const dateB = new Date(b.DATE);
                          return dateA.getTime() - dateB.getTime();
                        });
                        const latestProfit = parseFloat(sortedProfitData[sortedProfitData.length - 1]?.PROFIT || 0);
                        const profitPercentage = (latestProfit / portfolio.investedValue) * 100;
                        
                        // Simple IRR calculation: assume profits are realized over time period
                        const daysInvested = sortedProfitData.length; // Number of data points as proxy for days
                        const annualizedReturn = daysInvested > 0 ? (profitPercentage * 365) / daysInvested : 0;
                        
                        return `${annualizedReturn >= 0 ? '+' : ''}${annualizedReturn.toFixed(1)}%`;
                      }
                      return "Calculating...";
                    })()}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Internal Rate of Return
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Profit Chart */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    <span className="text-sm sm:text-base">Profit History</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Select value={profitTimeView} onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setProfitTimeView(value)}>
                      <SelectTrigger className="w-20 sm:w-32 text-xs sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={handleRefresh}
                      variant="outline"
                      size="sm"
                      disabled={profitLoading}
                      className="text-xs sm:text-sm"
                    >
                      {profitLoading ? (
                        <>
                          <RefreshCw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                          <span className="hidden sm:inline">Loading...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Refresh</span>
                        </>
                      )}
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Track your cumulative realized profits over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profitLoading ? (
                  <div className="h-48 sm:h-80 flex items-center justify-center">
                    <div className="text-center">
                      <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto mb-2 text-green-600" />
                      <p className="text-sm sm:text-base text-gray-500">Loading profit data...</p>
                    </div>
                  </div>
                ) : profitData && profitData.profit?.length > 0 ? (
                  <div className="h-48 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={(() => {
                        // Aggregate profit data by selected time period
                        const aggregatedData = aggregateDataByPeriod(profitData.profit, profitTimeView);
                        
                        return aggregatedData.map((item: any) => ({
                          ...item,
                          PROFIT: parseFloat(item.PROFIT || 0)
                        }));
                      })()}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis 
                          dataKey="DATE" 
                          tick={{ fontSize: 10 }}
                          stroke="#6B7280"
                        />
                        <YAxis 
                          tick={{ fontSize: 10 }}
                          stroke="#6B7280"
                          tickFormatter={(value) => `$${value.toLocaleString()}`}
                        />
                        <Tooltip 
                          formatter={(value: any) => [formatCurrency(value), 'Cumulative Profit']}
                          labelStyle={{ color: '#374151' }}
                          contentStyle={{ 
                            backgroundColor: '#F9FAFB', 
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px'
                          }}
                        />
                        <Line 
                          type="monotone"
                          dataKey="PROFIT" 
                          stroke="#10B981"
                          strokeWidth={3}
                          dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-48 sm:h-80 flex items-center justify-center">
                    <div className="text-center">
                      <PiggyBank className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500 text-base sm:text-lg font-medium">No profit data available</p>
                      <p className="text-gray-400 text-xs sm:text-sm mt-2">Your trading profits will appear here once data is available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}