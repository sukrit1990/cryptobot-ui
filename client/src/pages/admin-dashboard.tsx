import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { adminChangePasswordSchema, updateUserAdminSchema, updateUserFundSchema } from "@shared/schema";
import { 
  Users, 
  Settings, 
  Shield, 
  LogOut, 
  Edit, 
  Trash2, 
  ExternalLink,
  Eye,
  Key,
  FileText,
  DollarSign,
  Activity
} from "lucide-react";

// Component to display CryptoBot status for each user
function CryptoBotStatusCell({ userId, userEmail }: { userId: string; userEmail: string }) {
  const { data: statusData, isLoading, error } = useQuery({
    queryKey: [`/api/admin/users/${userId}/status`],
    enabled: true, // Always fetch
    refetchOnWindowFocus: false,
    staleTime: 5000, // 5 seconds
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="space-y-1">
        <Badge variant="outline">Loading...</Badge>
        <div className="text-xs text-gray-400">Fetching...</div>
      </div>
    );
  }

  if (error || !statusData) {
    return (
      <div className="space-y-1">
        <Badge variant="destructive">Error</Badge>
        <div className="text-xs text-gray-400">Failed to load</div>
      </div>
    );
  }

  const tradingState = statusData.accountState?.state;
  const tradingStatus = tradingState === 'A' ? 'Active' : tradingState === 'I' ? 'Inactive' : 'Unknown';
  const fundAmount = statusData.fundData?.fund || 'N/A';

  return (
    <div className="space-y-1">
      <Badge variant={tradingState === 'A' ? "default" : "secondary"}>
        {tradingStatus}
      </Badge>
      <div className="text-xs text-gray-500">
        S${fundAmount}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showFundDialog, setShowFundDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch admin session
  const { data: adminSession } = useQuery({
    queryKey: ["/api/admin/session"],
    retry: false,
  });

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: !!adminSession?.isAuthenticated,
  });

  // Fetch admin logs
  const { data: logs = [] } = useQuery({
    queryKey: ["/api/admin/logs"],
    enabled: !!adminSession?.isAuthenticated,
  });

  // Password change form
  const passwordForm = useForm({
    resolver: zodResolver(adminChangePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // User edit form
  const editForm = useForm({
    resolver: zodResolver(updateUserAdminSchema),
    defaultValues: {
      geminiApiKey: '',
      geminiApiSecret: '',
      investmentActive: true,
    },
  });

  // Fund update form
  const fundForm = useForm({
    resolver: zodResolver(updateUserFundSchema),
    defaultValues: {
      newFund: 0,
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/logout");
    },
    onSuccess: () => {
      window.location.href = "/admin/login";
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/admin/change-password", data);
    },
    onSuccess: () => {
      toast({
        title: "Password changed successfully",
        description: "Your admin password has been updated.",
      });
      passwordForm.reset();
      setShowPasswordDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Password change failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: any }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}`, data);
    },
    onSuccess: () => {
      toast({
        title: "User updated successfully",
        description: "User settings have been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowEditDialog(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "User deleted successfully",
        description: "User account has been completely removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get logs link mutation
  const getLogsLinkMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("GET", `/api/admin/users/${userId}/logs-link`);
      return response;
    },
    onSuccess: (data: any) => {
      window.open(data.dropboxLink, '_blank');
    },
    onError: (error: any) => {
      toast({
        title: "Failed to open logs",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get user status mutation - for quick status checks with toast notifications
  const getUserStatusMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("GET", `/api/admin/users/${userId}/status`);
      return response;
    },
    onSuccess: (data: any) => {
      const tradingState = data.accountState?.state;
      const tradingStatus = tradingState === 'A' ? 'Active' : tradingState === 'I' ? 'Inactive' : 'Unknown';
      const fundAmount = data.fundData?.fund || 'N/A';
      
      toast({
        title: "User Status Retrieved",
        description: `Trading Status: ${tradingStatus}, Funds: S$${fundAmount}`,
      });
      console.log('Detailed user status:', {
        email: data.userEmail,
        tradingState: data.accountState?.state,
        fundData: data.fundData,
        localSettings: data.localUser
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to get user status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update user fund mutation
  const updateUserFundMutation = useMutation({
    mutationFn: async ({ userId, newFund }: { userId: string; newFund: number }) => {
      await apiRequest("POST", `/api/admin/users/${userId}/update-fund`, { newFund });
    },
    onSuccess: () => {
      toast({
        title: "Fund updated successfully",
        description: "User fund has been updated in CryptoBot API.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowFundDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Fund update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    editForm.reset({
      geminiApiKey: '',
      geminiApiSecret: '',
      investmentActive: user.investmentActive,
    });
    setShowEditDialog(true);
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleUpdateFund = (user: any) => {
    setSelectedUser(user);
    fundForm.reset({
      newFund: user.initialFunds || 0,
    });
    setShowFundDialog(true);
  };

  const onPasswordSubmit = (data: any) => {
    changePasswordMutation.mutate(data);
  };

  const onEditSubmit = (data: any) => {
    if (selectedUser) {
      updateUserMutation.mutate({ userId: selectedUser.id, data });
    }
  };

  const onFundSubmit = (data: any) => {
    if (selectedUser) {
      updateUserFundMutation.mutate({ userId: selectedUser.id, newFund: data.newFund });
    }
  };

  if (!adminSession?.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500">You must be logged in as an admin.</p>
          <Button className="mt-4" onClick={() => window.location.href = "/admin/login"}>
            Go to Admin Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-red-600" />
              <h1 className="ml-3 text-xl font-semibold text-gray-900">Admin Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {adminSession.admin.username}
              </span>
              <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-change-password">
                    <Key className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change Admin Password</DialogTitle>
                    <DialogDescription>
                      Update your admin account password
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowPasswordDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={changePasswordMutation.isPending}
                        >
                          {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => logoutMutation.mutate()}
                data-testid="button-admin-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-users">{users.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Trading</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-active-trading">
                  {users.filter(u => u.investmentActive).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Actions</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-recent-actions">{logs.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user accounts, trading settings, and API credentials
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="text-center py-8">Loading users...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Funds</TableHead>
                      <TableHead>Trading</TableHead>
                      <TableHead>API Keys</TableHead>
                      <TableHead>Subscription</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user: any) => (
                      <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.firstName} {user.lastName}</div>
                            <div className="text-sm text-gray-500">ID: {user.id}</div>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>S${user.initialFunds}</TableCell>
                        <TableCell>
                          <CryptoBotStatusCell userId={user.id} userEmail={user.email} />
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.hasGeminiKeys ? "default" : "destructive"}>
                            {user.hasGeminiKeys ? "Configured" : "Missing"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.stripeSubscriptionId ? "default" : "secondary"}>
                            {user.stripeSubscriptionId ? "Active" : "None"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                              data-testid={`button-edit-${user.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => getUserStatusMutation.mutate(user.id)}
                              data-testid={`button-status-${user.id}`}
                            >
                              <Activity className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateFund(user)}
                              data-testid={`button-fund-${user.id}`}
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => getLogsLinkMutation.mutate(user.id)}
                              data-testid={`button-logs-${user.id}`}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-700"
                              data-testid={`button-delete-${user.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Recent Admin Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Admin Actions</CardTitle>
              <CardDescription>
                Recent administrative actions and system events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Target User</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.slice(0, 10).map((log: any) => (
                    <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                      <TableCell>
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                      <TableCell>{log.targetUserId || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details) : "-"}
                      </TableCell>
                      <TableCell>
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user settings and API credentials
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="text-sm text-gray-600">
                  Editing: {selectedUser.firstName} {selectedUser.lastName} ({selectedUser.email})
                </div>
                
                <FormField
                  control={editForm.control}
                  name="investmentActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Trading Active</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Enable or disable automated trading for this user
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="geminiApiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gemini API Key</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter new API key (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="geminiApiSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gemini API Secret</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter new API secret (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowEditDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateUserMutation.isPending}
                  >
                    {updateUserMutation.isPending ? "Updating..." : "Update User"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Fund Update Dialog */}
      <Dialog open={showFundDialog} onOpenChange={setShowFundDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update User Fund</DialogTitle>
            <div className="text-sm text-gray-600">
              Update fund amount for: <strong>{selectedUser?.email}</strong>
            </div>
          </DialogHeader>
          {selectedUser && (
            <Form {...fundForm}>
              <form onSubmit={fundForm.handleSubmit(onFundSubmit)} className="space-y-4">
                <FormField
                  control={fundForm.control}
                  name="newFund"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Fund Amount (S$)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          min="1"
                          placeholder="Enter fund amount" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowFundDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateUserFundMutation.isPending}
                  >
                    {updateUserFundMutation.isPending ? "Updating..." : "Update Fund"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}