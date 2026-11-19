import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

export const db = globalThis.prisma || new PrismaClient()

// Only client-side: override in development to avoid repeated initialization
// In production, Prisma Client is automatically cached
if (typeof window !== 'undefined' && !globalThis.prisma) {
  globalThis.prisma = db
}
