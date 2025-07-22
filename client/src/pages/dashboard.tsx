import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Portfolio } from "@shared/schema";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Coins,
  DollarSign
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: portfolio, isLoading, error } = useQuery<Portfolio>({
    queryKey: ["/api/portfolio"],
    retry: false,
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/portfolio/refresh");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      toast({
        title: "Portfolio refreshed",
        description: "Your portfolio data has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Refresh failed",
        description: error.message || "Failed to refresh portfolio data.",
        variant: "destructive",
      });
    },
  });

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32 mb-4" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Investment Dashboard</h1>
          <p className="text-gray-600 mt-2">Track your crypto portfolio performance</p>
        </div>
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <div className="text-red-500 mb-4">
              <TrendingDown className="mx-auto" size={48} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Portfolio Not Found</h3>
            <p className="text-gray-600 mb-4">
              Complete your account setup to start tracking your investments.
            </p>
            <Button onClick={() => window.location.reload()}>
              Reload Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const portfolioData = portfolio.portfolioData as any;
  const holdings = portfolioData?.holdings || [];
  const totalValue = parseFloat(portfolio.totalValue || "0");
  const totalReturns = parseFloat(portfolio.totalReturns || "0");
  const dailyPnL = parseFloat(portfolio.dailyPnL || "0");
  const lastUpdated = portfolio.lastUpdated;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: 'SGD',
    }).format(value);
  };

  const formatPercentage = (value: number, base: number) => {
    if (base === 0) return "0.00%";
    return ((value / base) * 100).toFixed(2) + "%";
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Investment Dashboard</h1>
          <p className="text-gray-600 mt-2">Track your crypto portfolio performance</p>
        </div>
        <Button 
          onClick={handleRefresh}
          disabled={refreshMutation.isPending}
          variant="outline"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Portfolio Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Wallet className="text-primary" size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className={`text-sm font-medium ${totalReturns >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalReturns >= 0 ? '+' : ''}{formatPercentage(totalReturns, totalValue - totalReturns)}
              </span>
              <span className="text-gray-500 text-sm ml-2">total return</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Returns</p>
                <p className={`text-2xl font-bold ${totalReturns >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalReturns >= 0 ? '+' : ''}{formatCurrency(totalReturns)}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-green-600" size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className={`text-sm font-medium ${totalReturns >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(totalReturns, totalValue - totalReturns)}
              </span>
              <span className="text-gray-500 text-sm ml-2">of investment</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Daily P&L</p>
                <p className={`text-2xl font-bold ${dailyPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {dailyPnL >= 0 ? '+' : ''}{formatCurrency(dailyPnL)}
                </p>
              </div>
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${dailyPnL >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {dailyPnL >= 0 ? 
                  <TrendingUp className="text-green-600" size={24} /> :
                  <TrendingDown className="text-red-600" size={24} />
                }
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className={`text-sm font-medium ${dailyPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(dailyPnL, totalValue)}
              </span>
              <span className="text-gray-500 text-sm ml-2">today</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Investments</p>
                <p className="text-2xl font-bold text-gray-900">{holdings.length}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Coins className="text-purple-600" size={24} />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-gray-600 text-sm">
                {holdings.slice(0, 3).map((h: any) => h.symbol).join(', ')}
                {holdings.length > 3 && ` +${holdings.length - 3} more`}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart Placeholder */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Portfolio Performance</CardTitle>
              <CardDescription>Real-time portfolio tracking</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button size="sm" variant="default">7D</Button>
              <Button size="sm" variant="outline">1M</Button>
              <Button size="sm" variant="outline">3M</Button>
              <Button size="sm" variant="outline">1Y</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <TrendingUp className="mx-auto mb-2" size={48} />
              <p className="font-medium">Portfolio Performance Chart</p>
              <p className="text-sm">Real-time data via Gemini API</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Holdings Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Holdings</CardTitle>
              <CardDescription>
                Last updated: {lastUpdated ? formatDistanceToNow(new Date(lastUpdated), { addSuffix: true }) : 'Never'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {holdings.length === 0 ? (
            <div className="text-center py-8">
              <Coins className="mx-auto mb-4 text-gray-400" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Holdings Found</h3>
              <p className="text-gray-600">
                Your portfolio will appear here once you have active investments.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Asset</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Holdings</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Current Price</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Market Value</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">24h Change</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((holding: any, index: number) => (
                    <tr key={index} className="border-b">
                      <td className="py-4 px-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                            {holding.symbol.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{holding.name}</div>
                            <div className="text-sm text-gray-500">{holding.symbol}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-900">{holding.amount} {holding.symbol}</td>
                      <td className="py-4 px-4 text-gray-900">{formatCurrency(holding.price)}</td>
                      <td className="py-4 px-4 font-medium text-gray-900">{formatCurrency(holding.value)}</td>
                      <td className="py-4 px-4">
                        <Badge 
                          variant={holding.change24h >= 0 ? "default" : "destructive"}
                          className={holding.change24h >= 0 ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                        >
                          {holding.change24h >= 0 ? '+' : ''}{holding.change24h.toFixed(2)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
