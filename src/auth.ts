import NextAuth, { type NextAuthConfig } from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compareSync } from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { getMongoClientPromise } from "@/lib/mongodb";
import { User } from "@/models/User";

export type UserRole = "customer" | "vendor" | "admin";

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(rawCredentials) {
      const parsed = z
        .object({ email: z.string().trim().email(), password: z.string().min(1) })
        .safeParse(rawCredentials);

      if (!parsed.success) {
        console.warn("[auth] Credentials format invalid:", parsed.error.flatten().fieldErrors);
        return null;
      }

      const email = parsed.data.email.toLowerCase().trim();

      if (!process.env.MONGODB_URI) {
        console.error("[auth] MONGODB_URI is not set.");
        return null;
      }

      await connectDB();
      const databaseUser = await User.findOne({
        email,
        deletedAt: { $exists: false },
      })
        .select("+passwordHash")
        .lean();

      if (!databaseUser) {
        console.warn(`[auth] Sign-in failed: No user found for "${email}". Check email spelling or register first.`);
        return null;
      }

      if (databaseUser.status === "suspended") {
        console.warn(`[auth] Sign-in failed: Account for "${email}" is suspended.`);
        return null;
      }

      if (!databaseUser.emailVerified) {
        console.warn(
          `[auth] Sign-in failed: Email "${email}" is not verified. Check email verification link or verify in /admin/users.`,
        );
        return null;
      }

      if (databaseUser.status !== "active") {
        console.warn(
          `[auth] Sign-in failed: Account status for "${email}" is "${databaseUser.status}" (must be "active").`,
        );
        return null;
      }

      if (!databaseUser.passwordHash || !compareSync(parsed.data.password, databaseUser.passwordHash)) {
        console.warn(`[auth] Sign-in failed: Password mismatch for "${email}".`);
        return null;
      }

      await User.updateOne({ _id: databaseUser._id }, { $set: { lastLoginAt: new Date() } });
      return {
        id: databaseUser._id.toString(),
        name: databaseUser.name,
        email: databaseUser.email,
        role: databaseUser.role,
      };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: process.env.MONGODB_URI ? MongoDBAdapter(getMongoClientPromise()) : undefined,
  providers,
  secret: process.env.AUTH_SECRET ?? "morrow-local-development-secret-change-before-deploying",
  trustHost: true,
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = user.role ?? "customer";
      } else if (trigger !== "signIn" && token.sub && process.env.MONGODB_URI) {
        try {
          await connectDB();
          const dbUser = await User.findById(token.sub).select("role").lean();
          if (dbUser) token.role = dbUser.role;
        } catch {
          /* keep existing token role if DB is unreachable */
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as UserRole | undefined) ?? "customer";
      }
      return session;
    },
  },
});
