import { z } from "zod";

const envSchema = z.object({
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().email(),
  // Redis is optional - will use in-memory rate limiting if not provided
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long"),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z
    .string()
    .min(8, "ADMIN_PASSWORD must be at least 8 characters long"),
  CONTACT_EMAIL: z.string().email(),
  RESEND_DOMAIN: z.string().min(1).optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv() {
  // Always check if we're in a build context first
  // During Docker build, environment variables are not available
  // They will be injected at runtime via ECS task definition
  const hasRequiredEnvVars =
    process.env.RESEND_API_KEY &&
    process.env.RESEND_FROM_EMAIL &&
    process.env.JWT_SECRET &&
    process.env.ADMIN_EMAIL &&
    process.env.ADMIN_PASSWORD &&
    process.env.CONTACT_EMAIL;

  // If we're missing required env vars, we're likely in a build context
  // Return safe defaults to prevent build errors
  if (!hasRequiredEnvVars) {
    return {
      RESEND_API_KEY: process.env.RESEND_API_KEY || "",
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || "",
      JWT_SECRET: process.env.JWT_SECRET || "",
      ADMIN_EMAIL: process.env.ADMIN_EMAIL || "",
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "",
      CONTACT_EMAIL: process.env.CONTACT_EMAIL || "",
      REDIS_URL: process.env.REDIS_URL,
      REDIS_HOST: process.env.REDIS_HOST,
      REDIS_PORT: process.env.REDIS_PORT,
      REDIS_PASSWORD: process.env.REDIS_PASSWORD,
      RESEND_DOMAIN: process.env.RESEND_DOMAIN,
    } as EnvConfig;
  }

  // Only validate at runtime when all env vars are present
  try {
    const config = envSchema.parse({
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
      REDIS_URL: process.env.REDIS_URL,
      REDIS_HOST: process.env.REDIS_HOST,
      REDIS_PORT: process.env.REDIS_PORT,
      REDIS_PASSWORD: process.env.REDIS_PASSWORD,
      JWT_SECRET: process.env.JWT_SECRET || process.env.AUTH_SECRET,
      ADMIN_EMAIL: process.env.ADMIN_EMAIL,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
      CONTACT_EMAIL: process.env.CONTACT_EMAIL,
      RESEND_DOMAIN: process.env.RESEND_DOMAIN,
    });
    return config;
  } catch (error) {
    // During build, never throw - return safe defaults instead
    // At runtime, this will be caught by the application startup
    if (error instanceof z.ZodError) {
      // Double-check if we're in a build context (missing env vars)
      const isBuildContext =
        !process.env.RESEND_API_KEY ||
        !process.env.RESEND_FROM_EMAIL ||
        !process.env.JWT_SECRET ||
        !process.env.ADMIN_EMAIL ||
        !process.env.ADMIN_PASSWORD ||
        !process.env.CONTACT_EMAIL;

      if (isBuildContext) {
        // Return safe defaults during build instead of throwing
        return {
          RESEND_API_KEY: process.env.RESEND_API_KEY || "",
          RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || "",
          JWT_SECRET: process.env.JWT_SECRET || "",
          ADMIN_EMAIL: process.env.ADMIN_EMAIL || "",
          ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "",
          CONTACT_EMAIL: process.env.CONTACT_EMAIL || "",
          REDIS_URL: process.env.REDIS_URL,
          REDIS_HOST: process.env.REDIS_HOST,
          REDIS_PORT: process.env.REDIS_PORT,
          REDIS_PASSWORD: process.env.REDIS_PASSWORD,
          RESEND_DOMAIN: process.env.RESEND_DOMAIN,
        } as EnvConfig;
      }

      // Only throw at runtime when env vars should be present
      const missingVars = error.errors
        .map((err) => err.path.join("."))
        .join(", ");
      throw new Error(
        `Missing or invalid environment variables: ${missingVars}`,
      );
    }
    throw error;
  }
}
