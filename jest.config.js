const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/__tests__/utils/',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
    '!src/test-utils/**',
    '!src/lib/validation-schemas.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 15,  // Current: ~12.48% | Target: 70% by Q4 2025
      branches: 10,    // Current: ~9.35% | Target: 70% by Q4 2025
      functions: 10,   // Current: ~8.52% | Target: 70% by Q4 2025
      lines: 15,       // Current: ~12.95% | Target: 70% by Q4 2025
    },
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uncrypto)/)',
  ],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  testTimeout: 10000, // 10 seconds timeout for tests
  maxWorkers: '50%', // Use half of available CPUs to avoid resource contention
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)

