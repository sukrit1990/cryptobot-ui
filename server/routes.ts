import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  updateUserSettingsSchema, 
  verifyOtpSchema,
  adminLoginSchema,
  adminChangePasswordSchema,
  updateUserAdminSchema,
  type AdminLogin,
  type AdminChangePassword,
  type UpdateUserAdmin,
} from "@shared/schema";
import { validateGeminiCredentials, getPortfolioData } from "./gemini";
import Stripe from "stripe";
import { z } from "zod";
import session from "express-session";
import memorystore from "memorystore";
import fetch from "node-fetch";
import { sendOtpEmail, generateOtpCode } from "./emailService";

// Initialize Stripe only if secret key is available
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-06-30.basil",
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware for local authentication
  const MemoryStore = memorystore(session);
  
  app.use(session({
    secret: process.env.SESSION_SECRET || 'default-session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Send OTP for email verification
  app.post('/api/send-otp', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email || !email.includes('@')) {
        return res.status(400).json({ message: "Valid email address is required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Generate OTP code
      const otpCode = generateOtpCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save OTP to database
      await storage.createOtpCode({
        email,
        code: otpCode,
        type: 'signup',
        expiresAt,
        verified: false,
      });

      // Send OTP email
      await sendOtpEmail(email, otpCode);

      console.log(`OTP sent to ${email}: ${otpCode}`);
      res.json({ message: "Verification code sent to your email address" });
    } catch (error: any) {
      console.error('Send OTP error:', error);
      res.status(500).json({ message: error.message || "Failed to send verification code" });
    }
  });

  // Verify OTP and complete registration
  app.post('/api/verify-otp', async (req, res) => {
    try {
      const otpData = verifyOtpSchema.parse(req.body);
      const { userData } = req.body;

      if (!userData) {
        return res.status(400).json({ message: "User registration data is required" });
      }

      // Verify OTP code
      const validOtp = await storage.verifyOtpCode(otpData.email, otpData.code, 'signup');
      if (!validOtp) {
        return res.status(400).json({ message: "Invalid or expired verification code" });
      }

      // Parse user data
      const parsedUserData = insertUserSchema.parse(userData);
      
      // Double-check email uniqueness before creating user
      const existingUser = await storage.getUserByEmail(parsedUserData.email);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists. Please sign in instead." });
      }
      
      // Validate minimum investment amount
      const minInvestment = 500;
      if (parseFloat(parsedUserData.initialFunds || "0") < minInvestment) {
        return res.status(400).json({ 
          message: `Minimum investment amount is S$${minInvestment}` 
        });
      }

      // Call external CryptoBot API for account creation
      const cryptoBotSignup = await fetch('https://cryptobot-api-f15f3256ac28.herokuapp.com/signup', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'x-api-key': 'L5oQfQ6OAmUQfGhdYsaSEEZqShpJBB2hYQg7nCehH9IzgeEX841EBGkRZp648XDz4Osj6vN0BgXvBRHbi6bqreTviFD7xnnXXV7D2N9nEDWMG25S7x31ve1I2W9pzVhA'
        },
        body: JSON.stringify({
          gemini_api_key: parsedUserData.geminiApiKey,
          gemini_api_secret: parsedUserData.geminiApiSecret,
          fund: parseFloat(parsedUserData.initialFunds || "0"),
          email: parsedUserData.email
        })
      });

      if (!cryptoBotSignup.ok) {
        const errorData = await cryptoBotSignup.text();
        console.error('CryptoBot API error:', errorData);
        return res.status(400).json({ 
          message: "Failed to create account with CryptoBot API. Please check your credentials." 
        });
      }

      // Create user in local database
      const user = await storage.createUser({
        email: parsedUserData.email,
        password: parsedUserData.password,
        firstName: parsedUserData.firstName,
        lastName: parsedUserData.lastName,
        geminiApiKey: parsedUserData.geminiApiKey,
        geminiApiSecret: parsedUserData.geminiApiSecret,
        initialFunds: parseFloat(parsedUserData.initialFunds || "0").toString(),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        investmentActive: false,
      });

      // Set user in session for auto-login
      (req.session as any).userId = user.id;
      (req.session as any).isAuthenticated = true;

      res.json({ 
        message: "Account created successfully!",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });
    } catch (error: any) {
      console.error('OTP verification error:', error);
      
      // Handle database constraint violations for duplicate email
      if (error.message && error.message.includes('duplicate key value violates unique constraint')) {
        return res.status(400).json({ message: "An account with this email already exists. Please sign in instead." });
      }
      
      res.status(500).json({ message: error.message || "Failed to verify email and create account" });
    }
  });

  // Public registration endpoint (no auth required) - Keep for backward compatibility
  app.post('/api/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists. Please sign in instead." });
      }
      
      console.log('=== Registration Request Received ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('Parsed userData:', JSON.stringify(userData, null, 2));
      
      // Show what will be sent to CryptoBot API
      console.log('=== CryptoBot API Payload ===');
      console.log('gemini_api_key:', userData.geminiApiKey || 'MISSING');
      console.log('gemini_api_secret:', userData.geminiApiSecret || 'MISSING');  
      console.log('fund:', parseFloat(userData.initialFunds || "0"));
      console.log('email:', userData.email || 'MISSING');
      console.log('API Key length:', (userData.geminiApiKey || '').length);
      console.log('API Secret length:', (userData.geminiApiSecret || '').length);
      console.log('=============================');
      console.log('=====================================');
      
      // Validate minimum investment amount
      const minInvestment = 500;
      if (parseFloat(userData.initialFunds || "0") < minInvestment) {
        return res.status(400).json({ 
          message: `Minimum investment amount is S$${minInvestment}` 
        });
      }

      // Call external CryptoBot API for account creation
      const cryptoBotSignup = await fetch('https://cryptobot-api-f15f3256ac28.herokuapp.com/signup', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'x-api-key': 'L5oQfQ6OAmUQfGhdYsaSEEZqShpJBB2hYQg7nCehH9IzgeEX841EBGkRZp648XDz4Osj6vN0BgXvBRHbi6bqreTviFD7xnnXXV7D2N9nEDWMG25S7x31ve1I2W9pzVhA'
        },
        body: JSON.stringify({
          gemini_api_key: userData.geminiApiKey,
          gemini_api_secret: userData.geminiApiSecret,
          fund: parseFloat(userData.initialFunds || "0"),
          email: userData.email
        })
      });

      if (!cryptoBotSignup.ok) {
        const errorData = await cryptoBotSignup.text();
        console.error('CryptoBot API error:', errorData);
        return res.status(400).json({ 
          message: "Failed to create account with CryptoBot API. Please check your credentials." 
        });
      }

      const cryptoBotResponse = await cryptoBotSignup.json();
      console.log('CryptoBot signup successful:', cryptoBotResponse);

      // Create user in database (let the database generate the ID)
      const { confirmPassword, ...userDataWithoutConfirm } = userData;
      const newUser = await storage.createUser({
        ...userDataWithoutConfirm,
      });

      res.json({ 
        message: "Account created successfully! You can now sign in.",
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
        }
      });
    } catch (error: any) {
      console.error("Error creating user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid data provided",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create user account" });
    }
  });

  // Sign-in endpoint for local authentication
  app.post('/api/signin', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Verify user credentials with encrypted password
      const user = await storage.verifyUserPassword(email, password);
      if (!user) {
        return res.status(400).json({ message: "Invalid email or password" });
      }

      // Create a simple session (store user ID in session)
      (req.session as any).userId = user.id;
      (req.session as any).isAuthenticated = true;

      // For now, return success - in a real app you'd create a session
      res.json({ 
        message: "Signed in successfully",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          geminiApiKey: user.geminiApiKey,
          geminiApiSecret: user.geminiApiSecret,
          initialFunds: user.initialFunds
        }
      });
    } catch (error) {
      console.error("Sign in error:", error);
      res.status(500).json({ message: "Failed to sign in" });
    }
  });

  // Local session check endpoint  
  app.get('/api/auth/session', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId || !session?.isAuthenticated) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Get user from database
      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        geminiApiKey: user.geminiApiKey,
        geminiApiSecret: user.geminiApiSecret,
        initialFunds: user.initialFunds
      });
    } catch (error) {
      console.error("Session check error:", error);
      res.status(500).json({ message: "Failed to check session" });
    }
  });

  // Send password reset OTP
  app.post('/api/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email || !email.includes('@')) {
        return res.status(400).json({ message: "Valid email address is required" });
      }

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // For security, don't reveal if email exists or not
        return res.json({ message: "If an account with this email exists, you will receive a password reset code." });
      }

      // Generate OTP code
      const otpCode = generateOtpCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save OTP to database
      await storage.createOtpCode({
        email,
        code: otpCode,
        type: 'password-reset',
        expiresAt,
        verified: false,
      });

      // Send password reset email
      await sendOtpEmail(email, otpCode, 'password-reset');

      console.log(`Password reset OTP sent to ${email}: ${otpCode}`);
      res.json({ message: "If an account with this email exists, you will receive a password reset code." });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: "Failed to send password reset code" });
    }
  });

  // Reset password with OTP
  app.post('/api/reset-password', async (req, res) => {
    try {
      const { email, code, newPassword, confirmPassword } = req.body;
      
      if (!email || !code || !newPassword || !confirmPassword) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "Passwords don't match" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Verify OTP code
      const validOtp = await storage.verifyOtpCode(email, code, 'password-reset');
      if (!validOtp) {
        return res.status(400).json({ message: "Invalid or expired reset code" });
      }

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      // Update password (will be automatically hashed)
      await storage.updateUser(user.id, { password: newPassword });

      res.json({ message: "Password reset successfully. You can now sign in with your new password." });
    } catch (error: any) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Change password endpoint
  app.post('/api/change-password', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId || !session?.isAuthenticated) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { currentPassword, newPassword, confirmPassword } = req.body;
      
      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ message: "All password fields are required" });
      }
      
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "New passwords don't match" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }
      
      // Get current user
      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify current password using encrypted verification
      const isCurrentPasswordValid = await storage.verifyUserPassword(user.email!, currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Update password (will be automatically hashed in storage layer)
      await storage.updateUser(session.userId, { password: newPassword });
      
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Update payment method endpoint
  app.post('/api/update-payment-method', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId || !session?.isAuthenticated) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { paymentMethodId } = req.body;
      
      if (!paymentMethodId) {
        return res.status(400).json({ message: "Payment method ID is required" });
      }

      // Get current user
      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.stripeCustomerId) {
        return res.status(400).json({ message: "No Stripe customer found" });
      }

      if (!stripe) {
        return res.status(500).json({ message: "Stripe not initialized" });
      }

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: user.stripeCustomerId,
      });

      // Set as default payment method
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Update subscription if exists
      if (user.stripeSubscriptionId) {
        await stripe.subscriptions.update(user.stripeSubscriptionId, {
          default_payment_method: paymentMethodId,
        });
      }

      res.json({ 
        message: "Payment method updated successfully",
        paymentMethodId 
      });
    } catch (error: any) {
      console.error("Update payment method error:", error);
      res.status(500).json({ message: error.message || "Failed to update payment method" });
    }
  });

  // Sign out endpoint (GET)
  app.get('/api/logout', async (req, res) => {
    try {
      const session = req.session as any;
      if (session) {
        session.userId = null;
        session.isAuthenticated = false;
        req.session.destroy((err) => {
          if (err) {
            console.error("Session destroy error:", err);
            return res.status(500).json({ message: "Failed to sign out" });
          }
          // Redirect to home page after successful logout
          res.redirect('/');
        });
      } else {
        // Redirect to home page if already signed out
        res.redirect('/');
      }
    } catch (error) {
      console.error("Sign out error:", error);
      res.status(500).json({ message: "Failed to sign out" });
    }
  });

  // Sign out endpoint (POST) - for dashboard
  app.post('/api/signout', async (req, res) => {
    try {
      const session = req.session as any;
      if (session) {
        session.userId = null;
        session.isAuthenticated = false;
        req.session.destroy((err) => {
          if (err) {
            console.error("Session destroy error:", err);
            return res.status(500).json({ message: "Failed to sign out" });
          }
          res.json({ message: "Signed out successfully", redirect: "/" });
        });
      } else {
        res.json({ message: "Already signed out", redirect: "/" });
      }
    } catch (error) {
      console.error("Sign out error:", error);
      res.status(500).json({ message: "Failed to sign out" });
    }
  });

  // Auth routes
  app.get('/api/auth/user', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId || !session?.isAuthenticated) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Don't send sensitive API credentials to frontend
      const safeUser = {
        ...user,
        geminiApiKey: user.geminiApiKey ? "***" : null,
        geminiApiSecret: user.geminiApiSecret ? "***" : null,
      };
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User registration/setup
  app.post('/api/auth/setup', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId || !session?.isAuthenticated) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const userData = insertUserSchema.parse(req.body);
      
      // Validate minimum investment amount
      const minInvestment = 500;
      if (parseFloat(userData.initialFunds || "0") < minInvestment) {
        return res.status(400).json({ 
          message: `Minimum investment amount is S$${minInvestment}` 
        });
      }

      // Call external CryptoBot API for account creation
      const cryptoBotSignup = await fetch('https://cryptobot-api-f15f3256ac28.herokuapp.com/signup', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'x-api-key': 'L5oQfQ6OAmUQfGhdYsaSEEZqShpJBB2hYQg7nCehH9IzgeEX841EBGkRZp648XDz4Osj6vN0BgXvBRHbi6bqreTviFD7xnnXXV7D2N9nEDWMG25S7x31ve1I2W9pzVhA'
        },
        body: JSON.stringify({
          gemini_api_key: userData.geminiApiKey,
          gemini_api_secret: userData.geminiApiSecret,
          fund: parseFloat(userData.initialFunds || "0"),
          email: userData.email
        })
      });

      if (!cryptoBotSignup.ok) {
        const errorData = await cryptoBotSignup.text();
        console.error('CryptoBot API error:', errorData);
        return res.status(400).json({ 
          message: "Failed to create account with CryptoBot API. Please check your credentials." 
        });
      }

      const cryptoBotResponse = await cryptoBotSignup.json();
      console.log('CryptoBot signup successful:', cryptoBotResponse);

      // Update user with additional data
      await storage.updateUserSetup(session.userId, userData);
      
      // Initialize portfolio
      await storage.createPortfolio(session.userId, {
        totalValue: userData.initialFunds,
        totalReturns: "0",
        dailyPnL: "0",
        portfolioData: { initialized: true, holdings: [] },
      });

      res.json({ 
        message: "User setup completed successfully",
        cryptoBotResponse: cryptoBotResponse
      });
    } catch (error: any) {
      console.error("Error setting up user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid data provided",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to setup user" });
    }
  });

  // Get portfolio data
  app.get('/api/portfolio', async (req, res) => {
    const session = req.session as any;
    if (!session?.userId || !session?.isAuthenticated) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const portfolio = await storage.getPortfolioByUserId(session.userId);
      
      if (!portfolio) {
        return res.status(404).json({ message: "Portfolio not found" });
      }

      res.json(portfolio);
    } catch (error) {
      console.error("Error fetching portfolio:", error);
      res.status(500).json({ message: "Failed to fetch portfolio" });
    }
  });

  // Update portfolio (daily refresh)
  app.post('/api/portfolio/refresh', async (req, res) => {
    const session = req.session as any;
    if (!session?.userId || !session?.isAuthenticated) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const user = await storage.getUser(session.userId);
      
      if (!user || !user.geminiApiKey || !user.geminiApiSecret) {
        return res.status(400).json({ message: "Gemini API credentials not configured" });
      }

      const portfolioData = await getPortfolioData(user.geminiApiKey, user.geminiApiSecret);
      
      await storage.updatePortfolio(session.userId, {
        totalValue: portfolioData.totalValue.toString(),
        totalReturns: portfolioData.totalReturns.toString(),
        dailyPnL: portfolioData.dailyPnL.toString(),
        portfolioData: portfolioData,
        lastUpdated: new Date(),
      });

      res.json({ message: "Portfolio refreshed successfully" });
    } catch (error) {
      console.error("Error refreshing portfolio:", error);
      res.status(500).json({ message: "Failed to refresh portfolio" });
    }
  });

  // Get current invested amount from CryptoBot API
  app.get('/api/account/fund', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId || !session?.isAuthenticated) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Get user to fetch their email
      const user = await storage.getUser(session.userId);
      if (!user || !user.email) {
        return res.status(400).json({ message: "User email not found" });
      }

      console.log(`Fetching fund amount for user: ${user.email}`);

      // Call CryptoBot API to get current fund amount
      const response = await fetch(`https://cryptobot-api-f15f3256ac28.herokuapp.com/account/fund?email=${encodeURIComponent(user.email)}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-api-key': 'L5oQfQ6OAmUQfGhdYsaSEEZqShpJBB2hYQg7nCehH9IzgeEX841EBGkRZp648XDz4Osj6vN0BgXvBRHbi6bqreTviFD7xnnXXV7D2N9nEDWMG25S7x31ve1I2W9pzVhA'
        }
      });

      if (!response.ok) {
        console.error('CryptoBot API fund fetch error:', response.status, response.statusText);
        return res.status(response.status).json({ 
          message: `Failed to fetch fund amount: ${response.statusText}` 
        });
      }

      const result = await response.json();
      console.log('Fund amount fetched successfully:', result);
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching fund amount:", error);
      res.status(500).json({ message: "Failed to fetch fund amount" });
    }
  });

  // Update user funds via CryptoBot API
  app.post('/api/settings', async (req, res) => {
    const session = req.session as any;
    if (!session?.userId || !session?.isAuthenticated) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const settings = updateUserSettingsSchema.parse(req.body);
      
      // Get user to fetch their email
      const user = await storage.getUser(session.userId);
      if (!user || !user.email) {
        return res.status(400).json({ message: "User email not found" });
      }

      console.log(`Updating funds for user: ${user.email}, new amount: ${settings.initialFunds}`);

      // Call CryptoBot API to update funds
      const response = await fetch(`https://cryptobot-api-f15f3256ac28.herokuapp.com/account/fund?email=${encodeURIComponent(user.email)}&new_fund=${settings.initialFunds}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'x-api-key': 'L5oQfQ6OAmUQfGhdYsaSEEZqShpJBB2hYQg7nCehH9IzgeEX841EBGkRZp648XDz4Osj6vN0BgXvBRHbi6bqreTviFD7xnnXXV7D2N9nEDWMG25S7x31ve1I2W9pzVhA',
          'Content-Type': 'application/json'
        },
        body: ''
      });

      if (!response.ok) {
        console.error('CryptoBot API fund update error:', response.status, response.statusText);
        return res.status(response.status).json({ 
          message: `Failed to update funds: ${response.statusText}` 
        });
      }

      const result = await response.json();
      console.log('Funds updated successfully:', result);
      
      // Also update local database with new fund amount
      await storage.updateUserSettings(session.userId, settings);
      
      res.json({ message: "Funds updated successfully", data: result });
    } catch (error: any) {
      console.error("Error updating funds:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid settings data",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update funds" });
    }
  });

  // Stripe payment method routes
  app.post('/api/payment-methods/setup-intent', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId || !session?.isAuthenticated) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (!stripe) {
        return res.status(500).json({ message: "Stripe is not configured. Please contact support." });
      }

      const user = await storage.getUser(session.userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let customerId = user.stripeCustomerId;
      
      // Create Stripe customer if doesn't exist
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
        });
        
        customerId = customer.id;
        await storage.updateUser(session.userId, { stripeCustomerId: customerId });
      }

      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        usage: 'off_session',
        payment_method_types: ['card'],
        metadata: {
          country: 'SG'
        }
      });

      res.json({ clientSecret: setupIntent.client_secret });
    } catch (error: any) {
      console.error("Error creating setup intent:", error);
      res.status(500).json({ message: "Failed to create setup intent: " + error.message });
    }
  });

  app.get('/api/payment-methods', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId || !session?.isAuthenticated) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(session.userId);
      if (!user || !user.stripeCustomerId) {
        return res.json([]);
      }

      if (!stripe) {
        return res.status(500).json({ message: "Stripe is not configured" });
      }

      // Fetch card payment methods only
      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card',
      });

      const formattedMethods = paymentMethods.data.map((pm: any) => ({
        id: pm.id,
        type: 'card',
        brand: pm.card.brand,
        last4: pm.card.last4,
        expiryMonth: pm.card.exp_month,
        expiryYear: pm.card.exp_year,
        displayName: `${pm.card.brand.toUpperCase()} ****${pm.card.last4}`,
        isDefault: false,
      }));
      
      res.json(formattedMethods);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      res.status(500).json({ message: "Failed to fetch payment methods" });
    }
  });

  app.post('/api/payment-methods', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId || !session?.isAuthenticated) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (!stripe) {
        return res.status(500).json({ message: "Stripe is not configured. Please contact support." });
      }

      const { paymentMethodId } = req.body;

      if (!paymentMethodId) {
        return res.status(400).json({ message: "Payment method ID is required" });
      }

      // Get payment method details from Stripe
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      
      const user = await storage.getUser(session.userId);
      if (!user || !user.stripeCustomerId) {
        return res.status(400).json({ message: "Stripe customer not found" });
      }

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: user.stripeCustomerId,
      });

      res.json({ message: "Payment method added successfully" });
    } catch (error: any) {
      console.error("Error adding payment method:", error);
      res.status(500).json({ message: "Failed to add payment method: " + error.message });
    }
  });

  app.delete('/api/payment-methods/:id', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId || !session?.isAuthenticated) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (!stripe) {
        return res.status(500).json({ message: "Stripe is not configured. Please contact support." });
      }

      const { id } = req.params;

      // Detach from Stripe customer
      await stripe.paymentMethods.detach(id);

      res.json({ message: "Payment method removed successfully" });
    } catch (error: any) {
      console.error("Error removing payment method:", error);
      res.status(500).json({ message: "Failed to remove payment method: " + error.message });
    }
  });

  // Portfolio history endpoint
  app.get('/api/portfolio/history', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId || !session?.isAuthenticated) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Get user to fetch their email
      const user = await storage.getUser(session.userId);
      if (!user || !user.email) {
        return res.status(400).json({ message: "User email not found" });
      }

      console.log(`Fetching portfolio history for user: ${user.email}`);

      // Fetch from CryptoBot API
      const response = await fetch(`https://cryptobot-api-f15f3256ac28.herokuapp.com/history?email=${encodeURIComponent(user.email)}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-api-key': 'L5oQfQ6OAmUQfGhdYsaSEEZqShpJBB2hYQg7nCehH9IzgeEX841EBGkRZp648XDz4Osj6vN0BgXvBRHbi6bqreTviFD7xnnXXV7D2N9nEDWMG25S7x31ve1I2W9pzVhA'
        }
      });

      if (!response.ok) {
        console.error('CryptoBot API error:', response.status, response.statusText);
        return res.status(response.status).json({ 
          message: `Failed to fetch portfolio history: ${response.statusText}` 
        });
      }

      const historyData = await response.json();
      console.log('Portfolio history fetched successfully:', historyData);
      
      // Transform the response to match expected format
      if (historyData && historyData.history && Array.isArray(historyData.history)) {
        const transformedData = historyData.history.map((item: any) => ({
          date: item.DATE,
          invested: parseFloat(item.INVESTED),
          current: parseFloat(item.CURRENT),
          value: parseFloat(item.CURRENT), // Use current value for chart
          timestamp: item.DATE
        }));
        res.json(transformedData);
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error("Portfolio history error:", error);
      res.status(500).json({ message: "Failed to fetch portfolio history" });
    }
  });

  // Account state endpoint
  app.get('/api/account/state', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId || !session?.isAuthenticated) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Get user to fetch their email
      const user = await storage.getUser(session.userId);
      if (!user || !user.email) {
        return res.status(400).json({ message: "User email not found" });
      }

      console.log(`Fetching account state for user: ${user.email}`);

      // Fetch from CryptoBot API
      const response = await fetch(`https://cryptobot-api-f15f3256ac28.herokuapp.com/account/state?email=${encodeURIComponent(user.email)}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-api-key': 'L5oQfQ6OAmUQfGhdYsaSEEZqShpJBB2hYQg7nCehH9IzgeEX841EBGkRZp648XDz4Osj6vN0BgXvBRHbi6bqreTviFD7xnnXXV7D2N9nEDWMG25S7x31ve1I2W9pzVhA'
        }
      });

      if (!response.ok) {
        console.error('CryptoBot API error:', response.status, response.statusText);
        return res.status(response.status).json({ 
          message: `Failed to fetch account state: ${response.statusText}` 
        });
      }

      const accountData = await response.json();
      console.log('Account state fetched successfully:', accountData);
      
      res.json(accountData);
    } catch (error) {
      console.error("Account state error:", error);
      res.status(500).json({ message: "Failed to fetch account state" });
    }
  });

  // Profit endpoint
  app.get('/api/profit', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId || !session?.isAuthenticated) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Get user to fetch their email
      const user = await storage.getUser(session.userId);
      if (!user || !user.email) {
        return res.status(400).json({ message: "User email not found" });
      }

      console.log(`Fetching profit data for user: ${user.email}`);

      // Fetch from CryptoBot API
      const response = await fetch(`https://cryptobot-api-f15f3256ac28.herokuapp.com/profit?email=${encodeURIComponent(user.email)}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-api-key': 'L5oQfQ6OAmUQfGhdYsaSEEZqShpJBB2hYQg7nCehH9IzgeEX841EBGkRZp648XDz4Osj6vN0BgXvBRHbi6bqreTviFD7xnnXXV7D2N9nEDWMG25S7x31ve1I2W9pzVhA'
        }
      });

      if (!response.ok) {
        console.error('CryptoBot profit API error:', response.status, response.statusText);
        return res.status(response.status).json({ 
          message: `Failed to fetch profit data: ${response.statusText}` 
        });
      }

      const profitData = await response.json();
      console.log('Profit data fetched successfully:', profitData);
      
      res.json(profitData);
    } catch (error) {
      console.error("Profit data error:", error);
      res.status(500).json({ message: "Failed to fetch profit data" });
    }
  });

  // Toggle account state endpoint
  app.post('/api/account/toggle', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId || !session?.isAuthenticated) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Get user to fetch their email
      const user = await storage.getUser(session.userId);
      if (!user || !user.email) {
        return res.status(400).json({ message: "User email not found" });
      }

      console.log(`Toggling account state for user: ${user.email}`);

      // Call CryptoBot API to toggle state
      const response = await fetch(`https://cryptobot-api-f15f3256ac28.herokuapp.com/account/state?email=${encodeURIComponent(user.email)}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'x-api-key': 'L5oQfQ6OAmUQfGhdYsaSEEZqShpJBB2hYQg7nCehH9IzgeEX841EBGkRZp648XDz4Osj6vN0BgXvBRHbi6bqreTviFD7xnnXXV7D2N9nEDWMG25S7x31ve1I2W9pzVhA',
          'Content-Type': 'application/json'
        },
        body: ''
      });

      if (!response.ok) {
        console.error('CryptoBot API toggle error:', response.status, response.statusText);
        return res.status(response.status).json({ 
          message: `Failed to toggle account state: ${response.statusText}` 
        });
      }

      const result = await response.json();
      console.log('Account state toggled successfully:', result);
      
      res.json(result);
    } catch (error) {
      console.error("Account toggle error:", error);
      res.status(500).json({ message: "Failed to toggle account state" });
    }
  });

  // Stripe setup intent for adding payment methods
  app.post('/api/payment-methods/setup-intent', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId || !session?.isAuthenticated) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Import Stripe
      const Stripe = require('stripe');
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ message: "Stripe not configured" });
      }
      
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      // Create or get Stripe customer
      let customerId = user.stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        });
        customerId = customer.id;
        
        // Update user with customer ID
        await storage.updateUser(session.userId, { stripeCustomerId: customerId });
      }

      // Create setup intent
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        usage: 'off_session',
        payment_method_types: ['card'],
      });

      res.json({ 
        clientSecret: setupIntent.client_secret,
        customerId: customerId
      });
    } catch (error) {
      console.error("Setup intent error:", error);
      res.status(500).json({ message: "Failed to create setup intent" });
    }
  });

  // Get payment methods
  app.get('/api/payment-methods', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId || !session?.isAuthenticated) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(session.userId);
      if (!user || !user.stripeCustomerId) {
        return res.json([]);
      }

      const Stripe = require('stripe');
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ message: "Stripe not configured" });
      }
      
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card',
      });

      const formattedMethods = paymentMethods.data.map((pm: any) => ({
        id: pm.id,
        brand: pm.card.brand,
        last4: pm.card.last4,
        expiryMonth: pm.card.exp_month,
        expiryYear: pm.card.exp_year,
        isDefault: false, // You can implement default logic later
      }));

      res.json(formattedMethods);
    } catch (error) {
      console.error("Payment methods error:", error);
      res.status(500).json({ message: "Failed to fetch payment methods" });
    }
  });

  // Setup intent for collecting payment method (card only)
  app.post('/api/setup-payment-method', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId || !session?.isAuthenticated) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (!stripe) {
        return res.status(500).json({ message: "Stripe is not configured" });
      }

      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create setup intent for card payment method collection
      const setupIntent = await stripe.setupIntents.create({
        usage: 'off_session',
        payment_method_types: ['card'], // Card payments only
        metadata: {
          user_id: session.userId,
          email: user.email || ''
        }
      });

      res.json({ 
        client_secret: setupIntent.client_secret,
        setup_intent_id: setupIntent.id
      });
    } catch (error: any) {
      console.error("Setup payment method error:", error);
      res.status(500).json({ 
        message: "Failed to setup payment method: " + error.message 
      });
    }
  });

  // Step 1: Create Stripe Customer with Payment Method
  app.post('/api/create-customer', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId || !session?.isAuthenticated) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { payment_method_id } = req.body;
      if (!payment_method_id) {
        return res.status(400).json({ message: "Payment method ID required" });
      }

      if (!stripe) {
        return res.status(500).json({ message: "Stripe is not configured" });
      }

      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create or update Stripe customer with payment method
      let customerId = user.stripeCustomerId;
      
      // Check if existing customer is valid in Stripe
      if (customerId) {
        try {
          await stripe.customers.retrieve(customerId);
          console.log(`Existing customer ${customerId} is valid`);
        } catch (customerError: any) {
          console.log(`Customer ${customerId} no longer exists in Stripe, will create new one`);
          customerId = null;
          await storage.updateUser(session.userId, { stripeCustomerId: null });
        }
      }
      
      if (!customerId) {
        // 1. Create customer
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
        });
        
        customerId = customer.id;
        console.log(`Created new customer ${customerId} for user ${user.email}`);
        await storage.updateUser(session.userId, { stripeCustomerId: customerId });
      }

      // 2. Attach payment method to the customer
      await stripe.paymentMethods.attach(payment_method_id, {
        customer: customerId,
      });

      // 3. Set payment method as default
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: payment_method_id,
        }
      });

      res.json({ customer_id: customerId });
    } catch (error: any) {
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Failed to create customer: " + error.message });
    }
  });

  // Step 2: Create Metered Subscription
  app.post('/api/create-subscription', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId || !session?.isAuthenticated) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (!stripe) {
        return res.status(500).json({ message: "Stripe is not configured" });
      }

      const user = await storage.getUser(session.userId);
      if (!user || !user.stripeCustomerId) {
        return res.status(400).json({ message: "Stripe customer required. Create customer first." });
      }

      // Check if user already has an active subscription
      if (user.stripeSubscriptionId) {
        const existingSubscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        if (existingSubscription.status === 'active') {
          return res.json({
            subscription_id: existingSubscription.id,
            subscription_item_id: existingSubscription.items.data[0].id,
            message: "Already subscribed"
          });
        }
      }

      // Verify customer exists and get customer to check for default payment method
      let customer;
      try {
        customer = await stripe.customers.retrieve(user.stripeCustomerId);
      } catch (customerError: any) {
        return res.status(400).json({ message: "Invalid Stripe customer. Please create customer first by adding a payment method." });
      }
      
      // Create new metered subscription with 30-day trial
      const subscriptionParams: any = {
        customer: user.stripeCustomerId,
        items: [{
          price: 'price_1RrVKkAU0aPHWB2SrdRNnBVm', // Metered price ID
        }],
        trial_period_days: 30, // 30-day free trial
        expand: ['latest_invoice.payment_intent'],
      };

      // Set default payment method if customer has one
      if (customer && !customer.deleted && customer.invoice_settings?.default_payment_method) {
        subscriptionParams.default_payment_method = customer.invoice_settings.default_payment_method;
      }

      const subscription = await stripe.subscriptions.create(subscriptionParams);

      const subscriptionItemId = subscription.items.data[0].id;

      // Update user with subscription ID
      await storage.updateUser(session.userId, { 
        stripeSubscriptionId: subscription.id 
      });

      res.json({
        subscription_id: subscription.id,
        subscription_item_id: subscriptionItemId,
        status: subscription.status,
        trial_ends_at: subscription.trial_end
      });
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Failed to create subscription: " + error.message });
    }
  });

  // Cancel subscription endpoint
  app.post('/api/cancel-subscription', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId || !session?.isAuthenticated) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (!stripe) {
        return res.status(500).json({ message: "Stripe is not configured" });
      }

      const user = await storage.getUser(session.userId);
      if (!user || !user.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription found" });
      }

      // Cancel the subscription immediately
      const subscription = await stripe.subscriptions.cancel(user.stripeSubscriptionId);

      // Remove subscription ID from user record
      await storage.updateUser(session.userId, { stripeSubscriptionId: null });

      // Toggle account state to inactive if currently active
      if (user.email) {
        try {
          const accountResponse = await fetch(`https://cryptobot-api-f15f3256ac28.herokuapp.com/account_state?email=${encodeURIComponent(user.email)}`, {
            method: 'GET',
            headers: {
              'x-api-key': 'L5oQfQ6OAmUQfGhdYsaSEEZqShpJBB2hYQg7nCehH9IzgeEX841EBGkRZp648XDz4Osj6vN0BgXvBRHbi6bqreTviFD7xnnXXV7D2N9nEDWMG25S7x31ve1I2W9pzVhA',
              'Content-Type': 'application/json'
            }
          });

          if (accountResponse.ok) {
            const accountData = await accountResponse.json();
            console.log("Current account state:", accountData);

            // If account is active (state: 'A'), toggle to inactive
            if (accountData.state === 'A') {
              const toggleResponse = await fetch('https://cryptobot-api-f15f3256ac28.herokuapp.com/toggle_account_state', {
                method: 'POST',
                headers: {
                  'x-api-key': 'L5oQfQ6OAmUQfGhdYsaSEEZqShpJBB2hYQg7nCehH9IzgeEX841EBGkRZp648XDz4Osj6vN0BgXvBRHbi6bqreTviFD7xnnXXV7D2N9nEDWMG25S7x31ve1I2W9pzVhA',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: user.email })
              });

              if (toggleResponse.ok) {
                console.log("Account state toggled to inactive");
              } else {
                console.error("Failed to toggle account state:", await toggleResponse.text());
              }
            }
          }
        } catch (error) {
          console.error("Error toggling account state:", error);
        }
      }

      res.json({
        message: "Subscription cancelled successfully",
        subscription_id: subscription.id,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_end: subscription.current_period_end
      });
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription: " + error.message });
    }
  });

  // Admin endpoint to cancel subscription by email
  app.post('/api/admin/cancel-subscription-by-email', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      if (!stripe) {
        return res.status(500).json({ message: "Stripe is not configured" });
      }

      // Get user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.stripeSubscriptionId) {
        return res.status(400).json({ message: "User has no active subscription" });
      }

      console.log(`Cancelling subscription for user: ${email}, subscription ID: ${user.stripeSubscriptionId}`);

      // Cancel the subscription immediately
      const subscription = await stripe.subscriptions.cancel(user.stripeSubscriptionId);

      // Remove subscription ID from user record
      await storage.updateUser(user.id, { stripeSubscriptionId: null });

      // Toggle account state to inactive if currently active
      if (user.email) {
        try {
          const accountResponse = await fetch(`https://cryptobot-api-f15f3256ac28.herokuapp.com/account_state?email=${encodeURIComponent(user.email)}`, {
            method: 'GET',
            headers: {
              'x-api-key': 'L5oQfQ6OAmUQfGhdYsaSEEZqShpJBB2hYQg7nCehH9IzgeEX841EBGkRZp648XDz4Osj6vN0BgXvBRHbi6bqreTviFD7xnnXXV7D2N9nEDWMG25S7x31ve1I2W9pzVhA',
              'Content-Type': 'application/json'
            }
          });

          if (accountResponse.ok) {
            const accountData = await accountResponse.json();
            console.log("Current account state:", accountData);

            // If account is active (state: 'A'), toggle to inactive
            if (accountData.state === 'A') {
              const toggleResponse = await fetch('https://cryptobot-api-f15f3256ac28.herokuapp.com/toggle_account_state', {
                method: 'POST',
                headers: {
                  'x-api-key': 'L5oQfQ6OAmUQfGhdYsaSEEZqShpJBB2hYQg7nCehH9IzgeEX841EBGkRZp648XDz4Osj6vN0BgXvBRHbi6bqreTviFD7xnnXXV7D2N9nEDWMG25S7x31ve1I2W9pzVhA',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: user.email })
              });

              if (toggleResponse.ok) {
                console.log("Account state toggled to inactive");
              } else {
                console.error("Failed to toggle account state:", await toggleResponse.text());
              }
            }
          }
        } catch (error) {
          console.error("Error toggling account state:", error);
        }
      }

      res.json({
        message: "Subscription cancelled successfully",
        user_email: email,
        user_id: user.id,
        subscription_id: subscription.id,
        cancelled_at: subscription.canceled_at,
        subscription_status: subscription.status
      });
    } catch (error: any) {
      console.error("Error cancelling subscription by email:", error);
      res.status(500).json({ message: "Failed to cancel subscription: " + error.message });
    }
  });

  // Report Usage endpoint (meter events disabled - only used for daily automated reporting)
  app.post('/api/report-usage', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId || !session?.isAuthenticated) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { usage_quantity } = req.body;
      if (!usage_quantity) {
        return res.status(400).json({ message: "Usage quantity required" });
      }

      const user = await storage.getUser(session.userId);
      if (!user || !user.stripeCustomerId) {
        return res.status(400).json({ message: "Stripe customer required" });
      }

      // Meter events are only created through daily automated reporting
      res.json({ 
        message: "Manual usage reporting is disabled. Usage is automatically reported daily.",
        user_id: user.id,
        usage_quantity: usage_quantity
      });
    } catch (error: any) {
      console.error("Error in report usage:", error);
      res.status(500).json({ message: "Failed to process usage report: " + error.message });
    }
  });

  // Daily Usage Reporting Job - Reports usage for all users with active subscriptions
  async function reportDailyUsageForAllUsers() {
    console.log('Starting daily usage reporting job...');
    
    try {
      // Get all users with active Stripe subscriptions
      const users = await storage.getAllUsersWithSubscriptions();
      
      // Also process specific user for testing if they exist
      const testUser = await storage.getUserByEmail('caanerishah14@gmail.com');
      if (testUser && !users.find(u => u.email === testUser.email)) {
        console.log('Adding test user caanerishah14@gmail.com to processing queue');
        users.push(testUser);
      }
      
      for (const user of users) {
        try {
          if (!user.email) {
            console.log(`Skipping user ${user.id}: missing email`);
            continue;
          }

          // Fetch profit data from CryptoBot API
          const profitResponse = await fetch(
            `https://cryptobot-api-f15f3256ac28.herokuapp.com/profit?email=${encodeURIComponent(user.email)}`,
            {
              headers: {
                'accept': 'application/json',
                'x-api-key': 'L5oQfQ6OAmUQfGhdYsaSEEZqShpJBB2hYQg7nCehH9IzgeEX841EBGkRZp648XDz4Osj6vN0BgXvBRHbi6bqreTviFD7xnnXXV7D2N9nEDWMG25S7x31ve1I2W9pzVhA'
              }
            }
          );

          if (!profitResponse.ok) {
            console.error(`Failed to fetch profit for user ${user.email}: ${profitResponse.status}`);
            continue;
          }

          const profitData = await profitResponse.json();
          console.log(`Profit data for ${user.email}:`, profitData);

          // Extract daily profit increment and convert to cents (multiply by 100 for integer requirement)
          let usageQuantity = 0;
          let originalProfitValue = 0;
          let dailyProfitIncrement = 0;
          
          if (profitData.profit && profitData.profit.length > 0) {
            // Get the latest profit entry (cumulative)
            const latestProfit = profitData.profit[profitData.profit.length - 1];
            const currentCumulativeProfit = parseFloat(latestProfit.PROFIT || 0);
            
            // Get the previous profit entry to calculate daily increment
            if (profitData.profit.length > 1) {
              const previousProfit = profitData.profit[profitData.profit.length - 2];
              const previousCumulativeProfit = parseFloat(previousProfit.PROFIT || 0);
              dailyProfitIncrement = Math.max(0, currentCumulativeProfit - previousCumulativeProfit);
            } else {
              // If this is the first entry, use the full amount as daily increment
              dailyProfitIncrement = Math.max(0, currentCumulativeProfit);
            }
            
            originalProfitValue = dailyProfitIncrement;
            // Convert to cents (multiply by 100) to preserve decimal precision as integer
            usageQuantity = Math.round(dailyProfitIncrement * 100);
          }

          console.log(`Reporting daily profit increment for ${user.email}: $${originalProfitValue} (${usageQuantity} cents)`);

          // Ensure we have a Stripe customer ID
          if (!user.stripeCustomerId) {
            console.log(`Skipping user ${user.email}: no Stripe customer ID`);
            continue;
          }

          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          if (subscription.status !== 'active' && subscription.status !== 'trialing') {
            console.log(`Skipping subscription for user ${user.email}: status ${subscription.status}`);
            continue;
          }

          // Report usage to Stripe using meter events API
          const meterEvent = await stripe.billing.meterEvents.create({
            event_name: 'realized_profit',
            timestamp: Math.floor(Date.now() / 1000),
            payload: {
              stripe_customer_id: user.stripeCustomerId,
              value: usageQuantity.toString()
            }
          });

          console.log(`Successfully reported daily profit increment meter event for ${user.email}: $${originalProfitValue} (${usageQuantity} cents), event ID: ${(meterEvent as any).id}`);

        } catch (userError: any) {
          console.error(`Error processing user ${user.email}:`, userError.message);
        }
      }

      console.log('Daily usage reporting job completed');
    } catch (error: any) {
      console.error('Error in daily usage reporting job:', error);
    }
  }

  // Manual trigger endpoint for daily usage reporting (disabled - automated only)
  app.post('/api/report-daily-usage', async (req, res) => {
    try {
      res.json({ 
        message: "Manual daily usage reporting is disabled. Usage reporting is fully automated and runs daily at 2 AM.",
        note: "Meter events are only created through the automated daily reporting system"
      });
    } catch (error: any) {
      console.error("Manual daily usage reporting error:", error);
      res.status(500).json({ message: "Failed to process request: " + error.message });
    }
  });

  // Test meter events endpoint (disabled - meter events only for daily automated reporting)
  app.post('/api/test-meter-event', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId || !session?.isAuthenticated) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(session.userId);
      if (!user || !user.stripeCustomerId) {
        return res.status(400).json({ message: "Stripe customer required" });
      }

      const testValue = req.body.value || 1;
      
      res.json({ 
        message: "Meter event testing is disabled. Meter events are only created through daily automated reporting.",
        customer_id: user.stripeCustomerId,
        test_value: testValue,
        note: "Daily automated reporting will handle all meter events"
      });
    } catch (error: any) {
      console.error("Error in test meter event:", error);
      res.status(500).json({ message: "Failed to process test request: " + error.message });
    }
  });

  // Reset user's Stripe customer ID (for testing/debugging)
  app.post('/api/reset-stripe-customer', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId || !session?.isAuthenticated) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Clear both customer and subscription IDs to allow fresh creation
      await storage.updateUser(session.userId, { 
        stripeCustomerId: null,
        stripeSubscriptionId: null 
      });

      res.json({ 
        message: "Stripe customer and subscription IDs reset successfully",
        user_email: user.email
      });
    } catch (error: any) {
      console.error("Error resetting Stripe customer:", error);
      res.status(500).json({ message: "Failed to reset Stripe customer: " + error.message });
    }
  });

  // Test meter events for specific user (no auth required for testing)
  app.post('/api/test-user-meter-event', async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ message: "Stripe is not configured" });
      }

      const email = req.body.email || req.query.email;
      if (!email) {
        return res.status(400).json({ message: "Email parameter required" });
      }
      
      console.log(`Testing meter event for user: ${email}`);

      // Get user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.stripeCustomerId) {
        return res.status(400).json({ message: "User has no Stripe customer ID" });
      }

      // Fetch latest profit from CryptoBot API
      const profitResponse = await fetch(
        `https://cryptobot-api-f15f3256ac28.herokuapp.com/profit?email=${encodeURIComponent(email)}`,
        {
          headers: {
            'accept': 'application/json',
            'x-api-key': 'L5oQfQ6OAmUQfGhdYsaSEEZqShpJBB2hYQg7nCehH9IzgeEX841EBGkRZp648XDz4Osj6vN0BgXvBRHbi6bqreTviFD7xnnXXV7D2N9nEDWMG25S7x31ve1I2W9pzVhA'
          }
        }
      );

      if (!profitResponse.ok) {
        return res.status(500).json({ message: `Failed to fetch profit data: ${profitResponse.status}` });
      }

      const profitData = await profitResponse.json() as any;
      console.log(`Profit data for ${email}:`, profitData);

      // Extract daily profit increment and convert to cents (multiply by 100 for integer requirement)
      let usageQuantity = 0;
      let originalProfitValue = 0;
      let dailyProfitIncrement = 0;
      
      if (profitData.profit && profitData.profit.length > 0) {
        // Get the latest profit entry (cumulative)
        const latestProfit = profitData.profit[profitData.profit.length - 1];
        const currentCumulativeProfit = parseFloat(latestProfit.PROFIT || 0);
        
        // Get the previous profit entry to calculate daily increment
        if (profitData.profit.length > 1) {
          const previousProfit = profitData.profit[profitData.profit.length - 2];
          const previousCumulativeProfit = parseFloat(previousProfit.PROFIT || 0);
          dailyProfitIncrement = Math.max(0, currentCumulativeProfit - previousCumulativeProfit);
        } else {
          // If this is the first entry, use the full amount as daily increment
          dailyProfitIncrement = Math.max(0, currentCumulativeProfit);
        }
        
        originalProfitValue = dailyProfitIncrement;
        // Convert to cents (multiply by 100) to preserve decimal precision as integer
        usageQuantity = Math.round(dailyProfitIncrement * 100);
      }

      // Meter events are only created through daily automated reporting
      res.json({ 
        message: "Daily profit increment meter event creation disabled for manual testing",
        user_email: email,
        customer_id: user.stripeCustomerId,
        daily_profit_increment_dollars: originalProfitValue,
        daily_profit_increment_cents: usageQuantity,
        profit_data: profitData,
        note: "Meter events are only created through daily automated reporting"
      });
    } catch (error: any) {
      console.error("Error creating user meter event:", error);
      res.status(500).json({ message: "Failed to create user meter event: " + error.message });
    }
  });

  // Get payment method details
  app.get('/api/payment-method', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId || !session?.isAuthenticated) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(session.userId);
      
      if (!user?.stripeSubscriptionId) {
        return res.status(404).json({ message: 'No active subscription found' });
      }

      if (!stripe) {
        return res.status(500).json({ message: "Stripe is not configured" });
      }

      // Step 1: Retrieve the subscription
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

      // Step 2: Get the default payment method from subscription
      const paymentMethodId = subscription.default_payment_method;

      if (!paymentMethodId) {
        return res.json({
          hasPaymentMethod: false
        });
      }

      // Step 3: Retrieve the payment method details
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId as string);

      if (paymentMethod && paymentMethod.card) {
        res.json({
          hasPaymentMethod: true,
          card: {
            brand: paymentMethod.card.brand,
            last4: paymentMethod.card.last4,
            expMonth: paymentMethod.card.exp_month,
            expYear: paymentMethod.card.exp_year
          }
        });
      } else {
        res.json({
          hasPaymentMethod: false
        });
      }

    } catch (error: any) {
      console.error('Error fetching payment method:', error);
      res.status(500).json({ 
        message: 'Failed to fetch payment method',
        error: error.message 
      });
    }
  });

  // Schedule daily usage reporting (runs at 2 AM daily)
  const scheduleInterval = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  // Calculate time until next 2 AM
  function getTimeUntilNext2AM() {
    const now = new Date();
    const next2AM = new Date();
    next2AM.setHours(2, 0, 0, 0);
    
    // If 2 AM today has passed, schedule for tomorrow
    if (now > next2AM) {
      next2AM.setDate(next2AM.getDate() + 1);
    }
    
    return next2AM.getTime() - now.getTime();
  }

  // Schedule the first run and then repeat daily
  setTimeout(() => {
    reportDailyUsageForAllUsers();
    
    // Then run every 24 hours
    setInterval(reportDailyUsageForAllUsers, scheduleInterval);
  }, getTimeUntilNext2AM());

  console.log('Daily usage reporting scheduled to run at 2 AM daily');

  // Subscription status endpoint
  app.get('/api/subscription-status', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId || !session?.isAuthenticated) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // If user has subscription, get trial end date from Stripe
      let trialEndsAt = null;
      if (user.stripeSubscriptionId && stripe) {
        try {
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          trialEndsAt = subscription.trial_end;
        } catch (error) {
          console.error("Error fetching subscription details:", error);
        }
      }

      res.json({
        hasSubscription: !!user.stripeSubscriptionId,
        subscriptionId: user.stripeSubscriptionId,
        customerId: user.stripeCustomerId,
        trialEndsAt,
      });
    } catch (error: any) {
      console.error("Error checking subscription status:", error);
      res.status(500).json({ message: "Failed to check subscription status: " + error.message });
    }
  });



  // Test Stripe connection endpoint
  app.get('/api/test-stripe-connection', async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ 
          success: false, 
          error: "Stripe not configured",
          hasSecretKey: !!process.env.STRIPE_SECRET_KEY 
        });
      }

      // Test Stripe connection by listing a single product
      const products = await stripe.products.list({ limit: 1 });
      
      res.json({ 
        success: true, 
        message: "Stripe connection successful",
        apiVersion: "2025-06-30.basil",
        hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
        testResult: "Connected to Stripe API",
        productCount: products.data.length
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message,
        hasSecretKey: !!process.env.STRIPE_SECRET_KEY
      });
    }
  });

  // Delete account endpoint
  app.delete('/api/delete-account', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId || !session?.isAuthenticated) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Call CryptoBot API to delete account
      const cryptoBotDelete = await fetch(`https://cryptobot-api-f15f3256ac28.herokuapp.com/account?email=${encodeURIComponent(user.email!)}`, {
        method: 'DELETE',
        headers: {
          'accept': 'application/json',
          'x-api-key': 'L5oQfQ6OAmUQfGhdYsaSEEZqShpJBB2hYQg7nCehH9IzgeEX841EBGkRZp648XDz4Osj6vN0BgXvBRHbi6bqreTviFD7xnnXXV7D2N9nEDWMG25S7x31ve1I2W9pzVhA'
        }
      });

      if (!cryptoBotDelete.ok) {
        const errorData = await cryptoBotDelete.text();
        console.error('CryptoBot API delete error:', errorData);
        return res.status(400).json({ 
          message: "Failed to delete account from CryptoBot API" 
        });
      }

      console.log('CryptoBot account deletion successful for:', user.email);

      // Cancel Stripe subscription if exists
      if (user.stripeSubscriptionId && stripe) {
        try {
          await stripe.subscriptions.cancel(user.stripeSubscriptionId);
          console.log('Stripe subscription cancelled:', user.stripeSubscriptionId);
        } catch (error) {
          console.error('Error cancelling Stripe subscription:', error);
        }
      }

      // Delete user from local database
      await storage.deleteUser(session.userId);
      
      // Destroy session
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destroy error:", err);
        }
      });

      res.json({ 
        message: "Account deleted successfully",
        deleted: true
      });
    } catch (error: any) {
      console.error("Delete account error:", error);
      res.status(500).json({ message: "Failed to delete account: " + error.message });
    }
  });

  // ============= ADMIN ROUTES =============

  // Admin authentication middleware
  const isAdminAuthenticated = (req: any, res: any, next: any) => {
    const session = req.session as any;
    if (!session?.adminId || !session?.isAdminAuthenticated) {
      return res.status(401).json({ message: "Admin authentication required" });
    }
    next();
  };

  // Admin login
  app.post('/api/admin/login', async (req, res) => {
    try {
      const loginData = adminLoginSchema.parse(req.body);
      
      const admin = await storage.getAdminByUsername(loginData.username);
      if (!admin) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Import verifyPassword function
      const { verifyPassword } = await import("./auth");
      const isValid = await verifyPassword(loginData.password, admin.password);
      
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set admin session
      (req.session as any).adminId = admin.id;
      (req.session as any).isAdminAuthenticated = true;
      (req.session as any).adminUsername = admin.username;

      // Log admin login
      await storage.logAdminAction({
        adminId: admin.id.toString(),
        action: 'LOGIN',
        details: { timestamp: new Date(), ip: req.ip }
      });

      res.json({ 
        message: "Admin logged in successfully",
        admin: { id: admin.id, username: admin.username }
      });
    } catch (error: any) {
      console.error("Admin login error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid login data",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Admin logout
  app.post('/api/admin/logout', async (req, res) => {
    const session = req.session as any;
    if (session?.adminId) {
      await storage.logAdminAction({
        adminId: session.adminId.toString(),
        action: 'LOGOUT',
        details: { timestamp: new Date() }
      });
    }

    req.session.destroy((err: any) => {
      if (err) {
        console.error("Admin session destroy error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Admin logged out successfully" });
    });
  });

  // Get admin session info
  app.get('/api/admin/session', (req, res) => {
    const session = req.session as any;
    if (session?.adminId && session?.isAdminAuthenticated) {
      res.json({ 
        isAuthenticated: true,
        admin: { 
          id: session.adminId, 
          username: session.adminUsername 
        }
      });
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Get all users (admin only)
  app.get('/api/admin/users', isAdminAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllUsersForAdmin();
      
      // Remove sensitive information from response
      const safeUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        initialFunds: user.initialFunds,
        investmentActive: user.investmentActive,
        riskTolerance: user.riskTolerance,
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionId: user.stripeSubscriptionId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        hasGeminiKeys: !!(user.geminiApiKey && user.geminiApiSecret)
      }));

      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user (admin only)
  app.patch('/api/admin/users/:userId', isAdminAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const updates = updateUserAdminSchema.parse(req.body);
      const session = req.session as any;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // If updating Gemini API credentials, call CryptoBot API to update them
      if (updates.geminiApiKey && updates.geminiApiSecret && user.email) {
        try {
          console.log(`Admin updating Gemini credentials for user: ${user.email}`);
          
          const cryptoBotUpdate = await fetch(`https://cryptobot-api-f15f3256ac28.herokuapp.com/account/keys?email=${encodeURIComponent(user.email)}&new_api_key=${encodeURIComponent(updates.geminiApiKey)}&new_api_secret=${encodeURIComponent(updates.geminiApiSecret)}`, {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'x-api-key': 'L5oQfQ6OAmUQfGhdYsaSEEZqShpJBB2hYQg7nCehH9IzgeEX841EBGkRZp648XDz4Osj6vN0BgXvBRHbi6bqreTviFD7xnnXXV7D2N9nEDWMG25S7x31ve1I2W9pzVhA'
            },
            body: ''
          });

          if (!cryptoBotUpdate.ok) {
            const errorData = await cryptoBotUpdate.text();
            console.error('CryptoBot API update credentials error:', errorData);
            return res.status(400).json({ 
              message: "Failed to update Gemini credentials in CryptoBot API" 
            });
          }

          console.log('CryptoBot API credentials update successful');
        } catch (error) {
          console.error('Error updating Gemini credentials in CryptoBot API:', error);
          return res.status(500).json({ 
            message: "Failed to communicate with CryptoBot API for credential update" 
          });
        }
      }

      // If updating investment active status, use account/state endpoint to control trading
      if (typeof updates.investmentActive === 'boolean' && user.email) {
        try {
          console.log(`Admin ${updates.investmentActive ? 'enabling' : 'disabling'} trading for user: ${user.email}`);
          
          // Note: Trading control is managed through the account/state endpoint
          // The actual implementation would depend on how the CryptoBot API handles state changes
          console.log(`Trading status will be controlled through account/state endpoint for ${user.email}`);
        } catch (error) {
          console.error('Error controlling trading in CryptoBot API:', error);
          return res.status(500).json({ 
            message: "Failed to communicate with CryptoBot API for trading control" 
          });
        }
      }

      // Update user in local database
      const updatedUser = await storage.updateUserByAdmin(userId, updates);

      // Log admin action
      await storage.logAdminAction({
        adminId: session.adminId.toString(),
        action: 'UPDATE_USER',
        targetUserId: userId,
        details: { 
          updates: updates,
          userEmail: user.email,
          timestamp: new Date() 
        }
      });

      res.json({ 
        message: "User updated successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          investmentActive: updatedUser.investmentActive,
          hasGeminiKeys: !!(updatedUser.geminiApiKey && updatedUser.geminiApiSecret)
        }
      });
    } catch (error: any) {
      console.error("Error updating user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid update data",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete user (admin only)
  app.delete('/api/admin/users/:userId', isAdminAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const session = req.session as any;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Cancel Stripe subscription if exists
      if (user.stripeSubscriptionId && stripe) {
        try {
          await stripe.subscriptions.cancel(user.stripeSubscriptionId);
          console.log('Stripe subscription cancelled by admin:', user.stripeSubscriptionId);
        } catch (error) {
          console.error('Error cancelling Stripe subscription:', error);
        }
      }

      // Delete from CryptoBot API using /account endpoint
      if (user.email) {
        try {
          const cryptoBotDelete = await fetch(`https://cryptobot-api-f15f3256ac28.herokuapp.com/account?email=${encodeURIComponent(user.email)}`, {
            method: 'DELETE',
            headers: {
              'accept': 'application/json',
              'x-api-key': 'L5oQfQ6OAmUQfGhdYsaSEEZqShpJBB2hYQg7nCehH9IzgeEX841EBGkRZp648XDz4Osj6vN0BgXvBRHbi6bqreTviFD7xnnXXV7D2N9nEDWMG25S7x31ve1I2W9pzVhA'
            }
          });

          if (!cryptoBotDelete.ok) {
            console.error('CryptoBot API delete error by admin');
          }
        } catch (error) {
          console.error('Error deleting from CryptoBot API:', error);
        }
      }

      // Delete user from local database
      await storage.deleteUser(userId);

      // Log admin action
      await storage.logAdminAction({
        adminId: session.adminId.toString(),
        action: 'DELETE_USER',
        targetUserId: userId,
        details: { 
          userEmail: user.email,
          timestamp: new Date() 
        }
      });

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Toggle trading state for user (admin only)
  app.post('/api/admin/users/:userId/toggle-trading', isAdminAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const session = req.session as any;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.email) {
        return res.status(400).json({ message: "User email not found" });
      }

      // Get current trading state from CryptoBot API
      const currentStateResponse = await fetch(`https://cryptobot-api-f15f3256ac28.herokuapp.com/account/state?email=${encodeURIComponent(user.email)}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-api-key': 'L5oQfQ6OAmUQfGhdYsaSEEZqShpJBB2hYQg7nCehH9IzgeEX841EBGkRZp648XDz4Osj6vN0BgXvBRHbi6bqreTviFD7xnnXXV7D2N9nEDWMG25S7x31ve1I2W9pzVhA'
        }
      });

      if (!currentStateResponse.ok) {
        return res.status(500).json({ message: "Failed to get current trading state" });
      }

      const currentStateData = await currentStateResponse.json();
      const currentState = currentStateData.state;
      const newState = currentState === 'A' ? 'I' : 'A'; // Toggle: A=Active, I=Inactive

      // Update trading state in CryptoBot API
      const updateStateResponse = await fetch(`https://cryptobot-api-f15f3256ac28.herokuapp.com/account/state?email=${encodeURIComponent(user.email)}&new_state=${newState}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'x-api-key': 'L5oQfQ6OAmUQfGhdYsaSEEZqShpJBB2hYQg7nCehH9IzgeEX841EBGkRZp648XDz4Osj6vN0BgXvBRHbi6bqreTviFD7xnnXXV7D2N9nEDWMG25S7x31ve1I2W9pzVhA'
        }
      });

      if (!updateStateResponse.ok) {
        return res.status(500).json({ message: "Failed to update trading state in CryptoBot API" });
      }

      // Also update investment active status in local database to match
      const investmentActive = newState === 'A';
      await storage.updateUserByAdmin(userId, { investmentActive });

      // Log admin action
      await storage.logAdminAction({
        adminId: session.adminId.toString(),
        action: 'TOGGLE_TRADING',
        targetUserId: userId,
        details: { 
          userEmail: user.email,
          previousState: currentState,
          newState: newState,
          timestamp: new Date() 
        }
      });

      res.json({ 
        message: `Trading state toggled to ${newState === 'A' ? 'Active' : 'Inactive'}`,
        newState: newState
      });
    } catch (error) {
      console.error("Error toggling trading state:", error);
      res.status(500).json({ message: "Failed to toggle trading state" });
    }
  });

  // Get admin logs
  app.get('/api/admin/logs', isAdminAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getRecentAdminLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching admin logs:", error);
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });

  // Change admin password
  app.post('/api/admin/change-password', isAdminAuthenticated, async (req, res) => {
    try {
      const passwordData = adminChangePasswordSchema.parse(req.body);
      const session = req.session as any;

      const admin = await storage.getAdminByUsername(session.adminUsername);
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      // Verify current password
      const { verifyPassword } = await import("./auth");
      const isCurrentValid = await verifyPassword(passwordData.currentPassword, admin.password);
      
      if (!isCurrentValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Update password
      await storage.updateAdminPassword(session.adminUsername, passwordData.newPassword);

      // Log admin action
      await storage.logAdminAction({
        adminId: session.adminId.toString(),
        action: 'CHANGE_PASSWORD',
        details: { timestamp: new Date() }
      });

      res.json({ message: "Password changed successfully" });
    } catch (error: any) {
      console.error("Error changing admin password:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid password data",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Get user status from CryptoBot API (admin only)
  app.get('/api/admin/users/:userId/status', isAdminAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.email) {
        return res.status(400).json({ message: "User email not found" });
      }

      // Get account state from CryptoBot API
      const accountStateResponse = await fetch(`https://cryptobot-api-f15f3256ac28.herokuapp.com/account/state?email=${encodeURIComponent(user.email)}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-api-key': 'L5oQfQ6OAmUQfGhdYsaSEEZqShpJBB2hYQg7nCehH9IzgeEX841EBGkRZp648XDz4Osj6vN0BgXvBRHbi6bqreTviFD7xnnXXV7D2N9nEDWMG25S7x31ve1I2W9pzVhA'
        }
      });

      // Get fund amount from CryptoBot API
      const fundResponse = await fetch(`https://cryptobot-api-f15f3256ac28.herokuapp.com/account/fund?email=${encodeURIComponent(user.email)}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-api-key': 'L5oQfQ6OAmUQfGhdYsaSEEZqShpJBB2hYQg7nCehH9IzgeEX841EBGkRZp648XDz4Osj6vN0BgXvBRHbi6bqreTviFD7xnnXXV7D2N9nEDWMG25S7x31ve1I2W9pzVhA'
        }
      });

      const accountState = accountStateResponse.ok ? await accountStateResponse.json() : null;
      const fundData = fundResponse.ok ? await fundResponse.json() : null;

      res.json({
        userEmail: user.email,
        userId: user.id,
        accountState,
        fundData,
        localUser: {
          investmentActive: user.investmentActive,
          initialFunds: user.initialFunds,
          hasGeminiKeys: !!(user.geminiApiKey && user.geminiApiSecret)
        }
      });
    } catch (error) {
      console.error("Error fetching user status:", error);
      res.status(500).json({ message: "Failed to fetch user status" });
    }
  });

  // Update user fund in CryptoBot API (admin only)
  app.post('/api/admin/users/:userId/update-fund', isAdminAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const { newFund } = req.body;
      const session = req.session as any;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.email) {
        return res.status(400).json({ message: "User email not found" });
      }

      if (!newFund || isNaN(newFund)) {
        return res.status(400).json({ message: "Valid fund amount required" });
      }

      console.log(`Admin updating fund for user: ${user.email} to ${newFund}`);

      // Call CryptoBot API to update fund
      const fundResponse = await fetch(`https://cryptobot-api-f15f3256ac28.herokuapp.com/account/fund?email=${encodeURIComponent(user.email)}&new_fund=${newFund}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'x-api-key': 'L5oQfQ6OAmUQfGhdYsaSEEZqShpJBB2hYQg7nCehH9IzgeEX841EBGkRZp648XDz4Osj6vN0BgXvBRHbi6bqreTviFD7xnnXXV7D2N9nEDWMG25S7x31ve1I2W9pzVhA'
        },
        body: ''
      });

      if (!fundResponse.ok) {
        const errorData = await fundResponse.text();
        console.error('CryptoBot API fund update error:', errorData);
        return res.status(400).json({ 
          message: "Failed to update fund in CryptoBot API" 
        });
      }

      const fundResult = await fundResponse.json();
      console.log('CryptoBot fund update successful:', fundResult);

      // Update local database
      await storage.updateUserByAdmin(userId, { initialFunds: parseFloat(newFund) });

      // Log admin action
      await storage.logAdminAction({
        adminId: session.adminId.toString(),
        action: 'UPDATE_USER_FUND',
        targetUserId: userId,
        details: { 
          userEmail: user.email,
          newFund: newFund,
          fundResult,
          timestamp: new Date() 
        }
      });

      res.json({ 
        message: "User fund updated successfully",
        fundResult
      });
    } catch (error) {
      console.error("Error updating user fund:", error);
      res.status(500).json({ message: "Failed to update user fund" });
    }
  });

  // Get Dropbox logs link for specific user (admin only)
  app.get('/api/admin/users/:userId/logs-link', isAdminAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate Dropbox link using the user's email or ID
      const dropboxLink = `https://www.dropbox.com/home/Apps/cryptobotgemini%20(1)/cryptobotgemini/${encodeURIComponent(user.email || userId)}`;
      
      res.json({ 
        dropboxLink,
        userEmail: user.email,
        userId: user.id
      });
    } catch (error) {
      console.error("Error generating logs link:", error);
      res.status(500).json({ message: "Failed to generate logs link" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
