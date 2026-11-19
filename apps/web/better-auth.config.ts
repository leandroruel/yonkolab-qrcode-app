import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./src/lib/prisma";
import nextCookies from "better-auth/next-cookies";

export const auth = betterAuth({
  database: prismaAdapter(prisma),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  cookies: nextCookies(),
});
