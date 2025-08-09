import { 
  users, 
  portfolios, 
  paymentMethods,
  otpCodes,
  admins,
  adminLogs,
  type User, 
  type UpsertUser,
  type Portfolio,
  type InsertPortfolio,
  type PaymentMethod,
  type InsertPaymentMethod,
  type UpdateUserSettings,
  type OtpCode,
  type InsertOtpCode,
  type Admin,
  type InsertAdmin,
  type AdminLog,
  type InsertAdminLog,
  type UpdateUserAdmin
} from "@shared/schema";
import { db } from "./db";
import { eq, and, lt, desc } from "drizzle-orm";
import { hashPassword, verifyPassword } from "./auth";

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
  verifyUserPassword(email: string, password: string): Promise<User | undefined>;
  
  // Portfolio operations
  getPortfolioByUserId(userId: string): Promise<Portfolio | undefined>;
  createPortfolio(userId: string, portfolioData: Partial<InsertPortfolio>): Promise<Portfolio>;
  updatePortfolio(userId: string, portfolioData: Partial<InsertPortfolio>): Promise<Portfolio>;
  
  // Payment method operations
  getPaymentMethodsByUserId(userId: string): Promise<PaymentMethod[]>;
  getPaymentMethodById(id: number): Promise<PaymentMethod | undefined>;
  createPaymentMethod(userId: string, paymentData: Partial<InsertPaymentMethod>): Promise<PaymentMethod>;
  deletePaymentMethod(id: number): Promise<void>;
  
  // OTP operations
  createOtpCode(otpData: InsertOtpCode): Promise<OtpCode>;
  verifyOtpCode(email: string, code: string, type: string): Promise<OtpCode | undefined>;
  deleteExpiredOtpCodes(): Promise<void>;
  
  // Admin operations
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  createAdmin(adminData: InsertAdmin): Promise<Admin>;
  updateAdminPassword(username: string, newPassword: string): Promise<Admin>;
  getAllUsersForAdmin(): Promise<User[]>;
  updateUserByAdmin(userId: string, updates: UpdateUserAdmin): Promise<User>;
  logAdminAction(logData: InsertAdminLog): Promise<AdminLog>;
  getRecentAdminLogs(limit?: number): Promise<AdminLog[]>;
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
    // Remove the id from userData if present, let DB generate it
    const { id, password, ...userDataWithoutId } = userData as any;
    
    // Hash password if provided
    const hashedPassword = password ? await hashPassword(password) : undefined;
    
    const [user] = await db
      .insert(users)
      .values({
        ...userDataWithoutId,
        ...(hashedPassword && { password: hashedPassword })
      })
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const { password, ...userDataWithoutPassword } = userData as any;
    
    // Hash password if provided
    const hashedPassword = password ? await hashPassword(password) : undefined;
    
    const [user] = await db
      .insert(users)
      .values({
        ...userDataWithoutPassword,
        ...(hashedPassword && { password: hashedPassword })
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userDataWithoutPassword,
          ...(hashedPassword && { password: hashedPassword }),
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

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    // If password is being updated, hash it
    const { password, ...otherUpdates } = updates as any;
    const hashedPassword = password ? await hashPassword(password) : undefined;
    
    const [user] = await db
      .update(users)
      .set({
        ...otherUpdates,
        ...(hashedPassword && { password: hashedPassword }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
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

  async verifyUserPassword(email: string, password: string): Promise<User | undefined> {
    const user = await this.getUserByEmail(email);
    if (!user || !user.password) {
      return undefined;
    }
    
    const isValid = await verifyPassword(password, user.password);
    return isValid ? user : undefined;
  }

  // OTP operations
  async createOtpCode(otpData: InsertOtpCode): Promise<OtpCode> {
    const [otpCode] = await db
      .insert(otpCodes)
      .values(otpData)
      .returning();
    return otpCode;
  }

  async verifyOtpCode(email: string, code: string, type: string): Promise<OtpCode | undefined> {
    const [otpCode] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.email, email),
          eq(otpCodes.code, code),
          eq(otpCodes.type, type),
          eq(otpCodes.verified, false)
        )
      );
    
    if (otpCode && new Date() < otpCode.expiresAt) {
      // Mark as verified
      await db
        .update(otpCodes)
        .set({ verified: true })
        .where(eq(otpCodes.id, otpCode.id));
      
      return otpCode;
    }
    
    return undefined;
  }

  async deleteExpiredOtpCodes(): Promise<void> {
    await db
      .delete(otpCodes)
      .where(lt(otpCodes.expiresAt, new Date()));
  }

  // Admin operations
  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.username, username));
    return admin;
  }

  async createAdmin(adminData: InsertAdmin): Promise<Admin> {
    const { password, ...otherData } = adminData;
    const hashedPassword = await hashPassword(password);
    
    const [admin] = await db
      .insert(admins)
      .values({
        ...otherData,
        password: hashedPassword,
      })
      .returning();
    return admin;
  }

  async updateAdminPassword(username: string, newPassword: string): Promise<Admin> {
    const hashedPassword = await hashPassword(newPassword);
    
    const [admin] = await db
      .update(admins)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(admins.username, username))
      .returning();
    return admin;
  }

  async getAllUsersForAdmin(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserByAdmin(userId: string, updates: UpdateUserAdmin): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async logAdminAction(logData: InsertAdminLog): Promise<AdminLog> {
    const [log] = await db
      .insert(adminLogs)
      .values(logData)
      .returning();
    return log;
  }

  async getRecentAdminLogs(limit: number = 50): Promise<AdminLog[]> {
    return await db
      .select()
      .from(adminLogs)
      .orderBy(desc(adminLogs.timestamp))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();