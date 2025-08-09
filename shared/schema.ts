import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  numeric,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  password: varchar("password"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  geminiApiKey: text("gemini_api_key"),
  geminiApiSecret: text("gemini_api_secret"),
  initialFunds: numeric("initial_funds", { precision: 12, scale: 2 }),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  investmentActive: boolean("investment_active").default(true),
  riskTolerance: varchar("risk_tolerance").default("moderate"), // conservative, moderate, aggressive
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const portfolios = pgTable("portfolios", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  totalValue: numeric("total_value", { precision: 15, scale: 2 }),
  totalReturns: numeric("total_returns", { precision: 15, scale: 2 }),
  dailyPnL: numeric("daily_pnl", { precision: 15, scale: 2 }),
  portfolioData: jsonb("portfolio_data"), // Store holdings and other portfolio info
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  stripePaymentMethodId: varchar("stripe_payment_method_id").notNull(),
  type: varchar("type").notNull(), // card, bank_account, etc.
  last4: varchar("last_4"),
  brand: varchar("brand"),
  expiryMonth: varchar("expiry_month"),
  expiryYear: varchar("expiry_year"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  email: varchar("email").notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  type: varchar("type").notNull(), // signup, login, etc.
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: varchar("username").unique().notNull(),
  password: varchar("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const adminLogs = pgTable("admin_logs", {
  id: serial("id").primaryKey(),
  adminId: varchar("admin_id").notNull(),
  action: varchar("action").notNull(),
  targetUserId: varchar("target_user_id"),
  details: jsonb("details"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Portfolio = typeof portfolios.$inferSelect;
export type InsertPortfolio = typeof portfolios.$inferInsert;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = typeof paymentMethods.$inferInsert;
export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertOtpCode = typeof otpCodes.$inferInsert;
export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = typeof admins.$inferInsert;
export type AdminLog = typeof adminLogs.$inferSelect;
export type InsertAdminLog = typeof adminLogs.$inferInsert;

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,  
  firstName: true,
  lastName: true,
  geminiApiKey: true,
  geminiApiSecret: true,
  initialFunds: true,
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  geminiApiKey: z.string().min(1, "Gemini API key is required"),
  geminiApiSecret: z.string().min(1, "Gemini API secret is required"),
  initialFunds: z.string().min(1, "Initial funds amount is required")
    .refine((val) => parseFloat(val) >= 500, "Minimum investment amount is S$500"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const updateUserSettingsSchema = createInsertSchema(users).pick({
  initialFunds: true,
  investmentActive: true,
}).extend({
  initialFunds: z.union([z.string(), z.number()])
    .transform(val => typeof val === 'string' ? parseFloat(val) : val)
    .refine(val => val >= 500, "Minimum investment amount is S$500"),
});

// OTP verification schema
export const verifyOtpSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  code: z.string().min(6, "OTP code must be 6 digits").max(6, "OTP code must be 6 digits"),
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// Reset password schema
export const resetPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  code: z.string().min(6, "Reset code must be 6 digits").max(6, "Reset code must be 6 digits"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Admin schemas
export const adminLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const adminChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const updateUserAdminSchema = z.object({
  geminiApiKey: z.string().optional(),
  geminiApiSecret: z.string().optional(),
  investmentActive: z.boolean().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUserSettings = z.infer<typeof updateUserSettingsSchema>;
export type VerifyOtp = z.infer<typeof verifyOtpSchema>;
export type ForgotPassword = z.infer<typeof forgotPasswordSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type AdminLogin = z.infer<typeof adminLoginSchema>;
export type AdminChangePassword = z.infer<typeof adminChangePasswordSchema>;
export type UpdateUserAdmin = z.infer<typeof updateUserAdminSchema>;
