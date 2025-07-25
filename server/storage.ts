import { 
  users, 
  portfolios, 
  paymentMethods,
  type User, 
  type UpsertUser,
  type Portfolio,
  type InsertPortfolio,
  type PaymentMethod,
  type InsertPaymentMethod,
  type UpdateUserSettings
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserSetup(id: string, userData: any): Promise<User>;
  updateUserSettings(id: string, settings: UpdateUserSettings): Promise<User>;
  updateStripeCustomerId(id: string, customerId: string): Promise<User>;
  getAllUsersWithSubscriptions(): Promise<User[]>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  
  // Portfolio operations
  getPortfolioByUserId(userId: string): Promise<Portfolio | undefined>;
  createPortfolio(userId: string, portfolioData: Partial<InsertPortfolio>): Promise<Portfolio>;
  updatePortfolio(userId: string, portfolioData: Partial<InsertPortfolio>): Promise<Portfolio>;
  
  // Payment method operations
  getPaymentMethodsByUserId(userId: string): Promise<PaymentMethod[]>;
  getPaymentMethodById(id: number): Promise<PaymentMethod | undefined>;
  createPaymentMethod(userId: string, paymentData: Partial<InsertPaymentMethod>): Promise<PaymentMethod>;
  deletePaymentMethod(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserSetup(id: string, userData: any): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        geminiApiKey: userData.geminiApiKey,
        geminiApiSecret: userData.geminiApiSecret,
        initialFunds: userData.initialFunds,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserSettings(id: string, settings: UpdateUserSettings): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        initialFunds: settings.initialFunds.toString(),
        investmentActive: settings.investmentActive,
        riskTolerance: settings.riskTolerance,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateStripeCustomerId(id: string, customerId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId: customerId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsersWithSubscriptions(): Promise<User[]> {
    const allUsers = await db.select().from(users);
    // Filter users that have active Stripe subscriptions
    return allUsers.filter(user => user.stripeSubscriptionId && user.stripeSubscriptionId.trim() !== '');
  }

  // Portfolio operations
  async getPortfolioByUserId(userId: string): Promise<Portfolio | undefined> {
    const [portfolio] = await db
      .select()
      .from(portfolios)
      .where(eq(portfolios.userId, userId));
    return portfolio;
  }

  async createPortfolio(userId: string, portfolioData: Partial<InsertPortfolio>): Promise<Portfolio> {
    const [portfolio] = await db
      .insert(portfolios)
      .values({
        userId,
        ...portfolioData,
      })
      .returning();
    return portfolio;
  }

  async updatePortfolio(userId: string, portfolioData: Partial<InsertPortfolio>): Promise<Portfolio> {
    const [portfolio] = await db
      .update(portfolios)
      .set(portfolioData)
      .where(eq(portfolios.userId, userId))
      .returning();
    return portfolio;
  }

  // Payment method operations
  async getPaymentMethodsByUserId(userId: string): Promise<PaymentMethod[]> {
    return await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.userId, userId));
  }

  async getPaymentMethodById(id: number): Promise<PaymentMethod | undefined> {
    const [paymentMethod] = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.id, id));
    return paymentMethod;
  }

  async createPaymentMethod(userId: string, paymentData: Partial<InsertPaymentMethod>): Promise<PaymentMethod> {
    const [paymentMethod] = await db
      .insert(paymentMethods)
      .values({
        userId,
        stripePaymentMethodId: paymentData.stripePaymentMethodId || "",
        type: paymentData.type || "card",
        last4: paymentData.last4 || null,
        brand: paymentData.brand || null,
        expiryMonth: paymentData.expiryMonth || null,
        expiryYear: paymentData.expiryYear || null,
        isDefault: paymentData.isDefault || false,
      })
      .returning();
    return paymentMethod;
  }

  async deletePaymentMethod(id: number): Promise<void> {
    await db
      .delete(paymentMethods)
      .where(eq(paymentMethods.id, id));
  }

  async deleteUser(id: string): Promise<void> {
    // Delete related records first
    await db.delete(paymentMethods).where(eq(paymentMethods.userId, id));
    await db.delete(portfolios).where(eq(portfolios.userId, id));
    
    // Delete the user record
    await db.delete(users).where(eq(users.id, id));
  }
}

export const storage = new DatabaseStorage();