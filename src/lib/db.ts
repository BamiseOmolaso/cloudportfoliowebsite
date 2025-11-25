// lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
}

const isTestEnv = process.env.NODE_ENV === 'test'

const createTestDb = () => {
  const notMocked = (method: string) => {
    return () => {
      throw new Error(`${method} is not mocked. Provide a mock implementation in tests.`)
    }
  }

  const modelStore: Record<string, Record<string, unknown>> = {}

  const ensureModelProxy = (modelName: string) => {
    if (!modelStore[modelName]) {
      modelStore[modelName] = {}
    }
    const methodStore = modelStore[modelName]

    return new Proxy(methodStore, {
      get(_target, prop: string | symbol) {
        if (typeof prop !== 'string') return undefined
        if (!(prop in methodStore)) {
          methodStore[prop] = notMocked(`db.${modelName}.${prop}`)
        }
        return methodStore[prop]
      },
      set(_target, prop: string | symbol, value) {
        if (typeof prop !== 'string') return false
        methodStore[prop] = value
        return true
      },
    })
  }

  return new Proxy(
    {},
    {
      get(_target, prop: string | symbol) {
        if (typeof prop !== 'string') return undefined
        return ensureModelProxy(prop)
      },
      set(_target, prop: string | symbol, value) {
        if (typeof prop !== 'string') return false
        modelStore[prop] = value as Record<string, unknown>
        return true
      },
    },
  ) as unknown as PrismaClient
}

const createRealDb = () => {
  const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
  }

  return prisma
}

export const db = isTestEnv ? createTestDb() : createRealDb()

export default db