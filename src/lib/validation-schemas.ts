import { z } from 'zod';

// Blog Post Schemas
export const blogPostCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(500, 'Excerpt must be less than 500 characters').optional().nullable(),
  cover_image: z.string().url('Cover image must be a valid URL').optional().nullable(),
  meta_title: z.string().max(60, 'Meta title must be less than 60 characters').optional().nullable(),
  meta_description: z.string().max(160, 'Meta description must be less than 160 characters').optional().nullable(),
  tags: z.array(z.string()).default([]),
  author: z.string().min(1, 'Author is required').max(100, 'Author name must be less than 100 characters'),
  status: z.enum(['draft', 'published', 'scheduled']).default('draft'),
});

export const blogPostUpdateSchema = blogPostCreateSchema.partial();

export const blogPostPatchSchema = z.object({
  status: z.enum(['draft', 'published', 'scheduled']).optional(),
  publishedAt: z.string().datetime().optional().nullable(),
});

// Project Schemas
export const projectCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  excerpt: z.string().max(500, 'Excerpt must be less than 500 characters').optional().nullable(),
  content: z.string().min(1, 'Content is required'),
  cover_image: z.string().url('Cover image must be a valid URL').optional().nullable(),
  meta_title: z.string().max(60, 'Meta title must be less than 60 characters').optional().nullable(),
  meta_description: z.string().max(160, 'Meta description must be less than 160 characters').optional().nullable(),
  technologies: z.array(z.string()).default([]),
  github_url: z.string().url('GitHub URL must be a valid URL').optional().nullable(),
  live_url: z.string().url('Live URL must be a valid URL').optional().nullable(),
  author: z.string().min(1, 'Author is required').max(100, 'Author name must be less than 100 characters'),
  status: z.enum(['draft', 'published', 'scheduled']).default('draft'),
});

export const projectUpdateSchema = projectCreateSchema.partial();

export const projectPatchSchema = z.object({
  status: z.enum(['draft', 'published', 'scheduled']).optional(),
  publishedAt: z.string().datetime().optional().nullable(),
});

// Newsletter Schemas
export const newsletterCreateSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject must be less than 200 characters'),
  content: z.string().min(1, 'Content is required'),
  status: z.enum(['draft', 'scheduled', 'sent']).default('draft'),
  scheduled_for: z.string().datetime().optional().nullable(),
});

export const newsletterUpdateSchema = newsletterCreateSchema.partial();

// Newsletter Send Schema
export const newsletterSendSchema = z.object({
  newsletterId: z.string().uuid('Newsletter ID must be a valid UUID'),
});

// Performance Metric Schema
export const performanceMetricSchema = z.object({
  url: z.string().url().optional(),
  metrics: z.record(z.any()),
  timestamp: z.string().datetime().optional(),
});

export const lcpMetricSchema = z.object({
  value: z.number().min(0),
  url: z.string().url().optional(),
});

