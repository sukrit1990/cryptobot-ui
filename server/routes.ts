import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertUserSchema, updateUserSettingsSchema } from "@shared/schema";
import { validateGeminiCredentials, getPortfolioData } from "./gemini";
import Stripe from "stripe";
import { z } from "zod";

// Initialize Stripe only if secret key is available
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-06-30.basil",
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Public registration endpoint (no auth required)
  app.post('/api/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
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
          'Content-Type': 'application/json'
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
      const newUser = await storage.createUser({
        id: userId,
        ...userData,
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

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
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
  app.post('/api/auth/setup', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
          'Content-Type': 'application/json'
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
      await storage.updateUserSetup(userId, userData);
      
      // Initialize portfolio
      await storage.createPortfolio(userId, {
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
  app.get('/api/portfolio', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const portfolio = await storage.getPortfolioByUserId(userId);
      
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
  app.post('/api/portfolio/refresh', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.geminiApiKey || !user.geminiApiSecret) {
        return res.status(400).json({ message: "Gemini API credentials not configured" });
      }

      const portfolioData = await getPortfolioData(user.geminiApiKey, user.geminiApiSecret);
      
      await storage.updatePortfolio(userId, {
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
  app.post('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = updateUserSettingsSchema.parse(req.body);
      
      await storage.updateUserSettings(userId, settings);
      
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
  app.post('/api/payment-methods/setup-intent', isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ message: "Stripe is not configured. Please contact support." });
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
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
        await storage.updateStripeCustomerId(userId, customerId);
      }

      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        usage: 'off_session',
      });

      res.json({ clientSecret: setupIntent.client_secret });
    } catch (error: any) {
      console.error("Error creating setup intent:", error);
      res.status(500).json({ message: "Failed to create setup intent: " + error.message });
    }
  });

  app.get('/api/payment-methods', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const paymentMethods = await storage.getPaymentMethodsByUserId(userId);
      
      res.json(paymentMethods);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      res.status(500).json({ message: "Failed to fetch payment methods" });
    }
  });

  app.post('/api/payment-methods', isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ message: "Stripe is not configured. Please contact support." });
      }

      const userId = req.user.claims.sub;
      const { paymentMethodId } = req.body;

      if (!paymentMethodId) {
        return res.status(400).json({ message: "Payment method ID is required" });
      }

      // Get payment method details from Stripe
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      
      if (paymentMethod.type === 'card' && paymentMethod.card) {
        await storage.createPaymentMethod(userId, {
          stripePaymentMethodId: paymentMethodId,
          type: 'card',
          last4: paymentMethod.card.last4,
          brand: paymentMethod.card.brand,
          expiryMonth: paymentMethod.card.exp_month.toString(),
          expiryYear: paymentMethod.card.exp_year.toString(),
          isDefault: true, // Make first payment method default
        });
      }

      res.json({ message: "Payment method added successfully" });
    } catch (error: any) {
      console.error("Error adding payment method:", error);
      res.status(500).json({ message: "Failed to add payment method: " + error.message });
    }
  });

  app.delete('/api/payment-methods/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ message: "Stripe is not configured. Please contact support." });
      }

      const userId = req.user.claims.sub;
      const { id } = req.params;

      const paymentMethod = await storage.getPaymentMethodById(parseInt(id));
      
      if (!paymentMethod || paymentMethod.userId !== userId) {
        return res.status(404).json({ message: "Payment method not found" });
      }

      // Detach from Stripe
      await stripe.paymentMethods.detach(paymentMethod.stripePaymentMethodId);
      
      // Delete from database
      await storage.deletePaymentMethod(parseInt(id));

      res.json({ message: "Payment method removed successfully" });
    } catch (error: any) {
      console.error("Error removing payment method:", error);
      res.status(500).json({ message: "Failed to remove payment method: " + error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
