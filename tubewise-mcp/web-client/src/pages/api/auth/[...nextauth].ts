import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { authService } from "@/services/authService";
import { UserRole } from "@/models/User";

// Extend the built-in NextAuth User type
declare module "next-auth" {
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: UserRole;
    token: string;
    credits: number;
    languagePreference: string;
  }
}

export default NextAuth({
  providers: [
    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    
    // Credentials Provider (for email/password login)
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        
        try {
          const user = await authService.login(
            credentials.email,
            credentials.password
          );
          
          if (user && user.token) {
            return {
              id: user.id.toString(),
              name: user.name,
              email: user.email,
              role: user.role,
              token: user.token,
              credits: user.credits,
              languagePreference: user.languagePreference
            };
          }
          
          return null;
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        // If using OAuth
        if (account.provider === "google") {
          try {
            // Register or login user with Google credentials
            const response = await authService.oauthLogin({
              email: user.email as string,
              name: user.name as string,
              provider: "google",
              providerId: user.id
            });
            
            if (response) {
              token.id = response.id;
              token.role = response.role;
              token.accessToken = response.token;
              token.credits = response.credits;
              token.languagePreference = response.languagePreference;
            }
          } catch (error) {
            console.error("OAuth login error:", error);
          }
        } else {
          // If using credentials
          token.id = user.id;
          token.role = user.role;
          token.accessToken = user.token;
          token.credits = user.credits;
          token.languagePreference = user.languagePreference;
        }
      }
      
      return token;
    },
    
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.accessToken = token.accessToken as string;
        session.user.credits = token.credits as number;
        session.user.languagePreference = token.languagePreference as string;
      }
      
      return session;
    }
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error"
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET
});
