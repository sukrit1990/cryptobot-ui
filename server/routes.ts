import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, updateUserSettingsSchema } from "@shared/schema";
import { validateGeminiCredentials, getPortfolioData } from "./gemini";
import Stripe from "stripe";
import { z } from "zod";
import session from "express-session";
import memorystore from "memorystore";

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

  // Public registration endpoint (no auth required)
  app.post('/api/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
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
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      // Validate minimum investment amount
      const minInvestment = 1000;
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

      // Create user in database (generate a unique ID)
      const userId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const { confirmPassword, ...userDataWithoutConfirm } = userData;
      const newUser = await storage.createUser({
        id: userId,
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

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "Invalid email or password" });
      }

      // Verify password (in a real app, you'd hash and compare)
      if (user.password !== password) {
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

  // Sign out endpoint
  app.post('/api/signout', async (req, res) => {
    try {
      (req.session as any).userId = null;
      (req.session as any).isAuthenticated = false;
      req.session.destroy(() => {
        res.json({ message: "Signed out successfully" });
      });
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
      const minInvestment = 1000;
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

  // Update user settings
  app.post('/api/settings', async (req, res) => {
    const session = req.session as any;
    if (!session?.userId || !session?.isAuthenticated) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const settings = updateUserSettingsSchema.parse(req.body);
      
      await storage.updateUserSettings(session.userId, settings);
      
      res.json({ message: "Settings updated successfully" });
    } catch (error: any) {
      console.error("Error updating settings:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid settings data",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update settings" });
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

  // Save payment method after setup and create subscription
  app.post('/api/payment-methods', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId || !session?.isAuthenticated) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { paymentMethodId } = req.body;
      if (!paymentMethodId) {
        return res.status(400).json({ message: "Payment method ID required" });
      }

      const user = await storage.getUser(session.userId);
      if (!user || !user.stripeCustomerId) {
        return res.status(400).json({ message: "Stripe customer not found" });
      }

      if (!stripe) {
        return res.status(500).json({ message: "Stripe is not configured" });
      }

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: user.stripeCustomerId,
      });

      // Check if user already has an active subscription
      const existingSubscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: 'active',
      });

      let subscriptionResult = null;

      if (existingSubscriptions.data.length === 0) {
        // Create new subscription with the payment method
        const subscription = await stripe.subscriptions.create({
          customer: user.stripeCustomerId,
          items: [{
            price: 'price_1RoRk1AU0aPHWB2SEy3NtXI8', // Singapore-specific price
          }],
          default_payment_method: paymentMethodId,
          payment_settings: {
            save_default_payment_method: 'on_subscription',
            payment_method_types: ['card'],
          },
        });

        // Update user with subscription ID
        await storage.updateUser(session.userId, { 
          stripeSubscriptionId: subscription.id 
        });

        subscriptionResult = {
          subscriptionId: subscription.id,
          status: subscription.status,
          message: "Subscription created successfully"
        };
      } else {
        subscriptionResult = {
          subscriptionId: existingSubscriptions.data[0].id,
          status: existingSubscriptions.data[0].status,
          message: "Existing subscription updated with new payment method"
        };

        // Update default payment method for existing subscription
        await stripe.subscriptions.update(existingSubscriptions.data[0].id, {
          default_payment_method: paymentMethodId,
        });
      }

      res.json({ 
        success: true, 
        message: "Payment method added successfully",
        subscription: subscriptionResult
      });
    } catch (error: any) {
      console.error("Save payment method error:", error);
      res.status(500).json({ 
        message: "Failed to save payment method: " + error.message 
      });
    }
  });

  // Subscription management endpoints
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

      // Check if user already has an active subscription
      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        if (subscription.status === 'active') {
          return res.json({
            subscriptionId: subscription.id,
            status: subscription.status,
            message: "Already subscribed"
          });
        }
      }

      // Create new subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{
          price: 'price_1RoRk1AU0aPHWB2SEy3NtXI8', // Singapore-specific price
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
      });

      // Update user with subscription ID
      await storage.updateUser(session.userId, { 
        stripeSubscriptionId: subscription.id 
      });

      res.json({
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
        status: subscription.status,
      });
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Failed to create subscription: " + error.message });
    }
  });

  app.get('/api/subscription-status', async (req, res) => {
    try {
      const session = req.session as any;
      if (!session?.userId || !session?.isAuthenticated) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(session.userId);
      if (!user || !user.stripeSubscriptionId) {
        return res.json({ status: 'inactive' });
      }

      if (!stripe) {
        return res.status(500).json({ message: "Stripe is not configured" });
      }

      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      
      res.json({
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        priceId: subscription.items.data[0]?.price.id,
      });
    } catch (error: any) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ message: "Failed to fetch subscription status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
