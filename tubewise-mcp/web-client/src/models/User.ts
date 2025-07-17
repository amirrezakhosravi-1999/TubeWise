export interface User {
  id: string;
  email: string;
  name: string;
  password?: string; // In a real app, this would be hashed
  role: UserRole;
  credits: number;
  languagePreference: string;
  createdAt: Date;
  updatedAt: Date;
  oauthProvider?: string;
  oauthProviderId?: string;
  subscriptionId?: string;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionPlan?: SubscriptionPlan;
  subscriptionPeriodEnd?: Date;
}

export enum UserRole {
  FREE = 'free',
  PRO = 'pro',
  ADMIN = 'admin'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  UNPAID = 'unpaid',
  TRIAL = 'trial',
  NONE = 'none'
}

export enum SubscriptionPlan {
  FREE = 'free',
  PRO_MONTHLY = 'pro_monthly',
  PRO_YEARLY = 'pro_yearly'
}

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  token: string;
  credits: number;
  languagePreference: string;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionPlan?: SubscriptionPlan;
}

// NextAuth session extension
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      accessToken: string;
      credits: number;
      languagePreference: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    accessToken: string;
    credits: number;
    languagePreference: string;
  }
}