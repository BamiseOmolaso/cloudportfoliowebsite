// Type definitions for database update operations

import type { Prisma } from '@prisma/client';

export type BlogPostUpdateData = Partial<{
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  coverImage: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  tags: string[];
  author: string;
  status: 'draft' | 'published' | 'scheduled';
  publishedAt: Date | null;
  updatedAt: Date;
}>;

export type ProjectUpdateData = Partial<{
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  technologies: string[];
  githubUrl: string | null;
  liveUrl: string | null;
  author: string;
  status: 'draft' | 'published' | 'scheduled';
  publishedAt: Date | null;
  updatedAt: Date;
}>;

export type NewsletterUpdateData = Partial<{
  subject: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sent';
  scheduledFor: Date | null;
  updatedAt: Date;
}>;

export type FailedAttemptWhere = {
  timestamp: { gte: Date };
  OR: Array<{ ipAddress: string } | { email: string }>;
};

