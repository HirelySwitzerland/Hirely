import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // On Vercel with a Neon database, the pooled connection string made for Prisma; otherwise DATABASE_URL.
    ...(process.env.POSTGRES_PRISMA_URL ? { datasourceUrl: process.env.POSTGRES_PRISMA_URL } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
