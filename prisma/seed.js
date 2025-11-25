const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');
  console.log(
    'DB URL used:',
    process.env.DATABASE_URL || 'NOT SET - check .env / .env.local'
  );

  // PROJECT 1
  const project1 = await prisma.project.upsert({
    where: { slug: 'portfolio-aws-infrastructure' },
    update: {},
    create: {
      title: 'Portfolio Website - AWS Infrastructure',
      slug: 'portfolio-aws-infrastructure',
      content:
        'Complete DevOps portfolio showcasing AWS deployment with ECS Fargate, RDS, and Terraform IaC',
      excerpt:
        'Modern portfolio built with Next.js 14, deployed on AWS using containers',
      technologies: [
        'Next.js',
        'TypeScript',
        'AWS',
        'Terraform',
        'Docker',
        'PostgreSQL',
      ],
      author: 'Bamise Omolaso',
      status: 'published',
      publishedAt: new Date(),
    },
  });

  // PROJECT 2
  const project2 = await prisma.project.upsert({
    where: { slug: 'newsletter-system' },
    update: {},
    create: {
      title: 'Newsletter Management System',
      slug: 'newsletter-system',
      content:
        'Complete newsletter system with subscriber management, tagging, and analytics',
      excerpt: 'Built with Prisma, PostgreSQL, and Resend API',
      technologies: ['Prisma', 'PostgreSQL', 'Resend', 'Next.js'],
      author: 'Bamise Omolaso',
      status: 'published',
      publishedAt: new Date(),
    },
  });

  console.log(`✅ Created/Updated project: ${project1.title}`);
  console.log(`✅ Created/Updated project: ${project2.title}`);

  // BLOG POST
  const blogPost = await prisma.blogPost.upsert({
    where: { slug: 'migrating-vercel-to-aws' },
    update: {},
    create: {
      title: 'Migrating from Vercel to AWS: A Complete Guide',
      slug: 'migrating-vercel-to-aws',
      content: `# Migrating from Vercel to AWS

This is my journey migrating a Next.js application from Vercel to AWS ECS Fargate.

## Why AWS?

Learning DevOps and infrastructure as code...`,
      excerpt: 'Complete guide to deploying Next.js on AWS with ECS and RDS',
      tags: ['AWS', 'DevOps', 'Next.js', 'Terraform'],
      author: 'Bamise Omolaso',
      status: 'published',
      publishedAt: new Date(),
    },
  });

  console.log(`✅ Created/Updated blog post: ${blogPost.title}`);

  // NEWSLETTER SUBSCRIBER
  const subscriber = await prisma.newsletterSubscriber.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test Subscriber',
      isSubscribed: true,
      preferences: {
        frequency: 'weekly',
        categories: ['devops', 'aws'],
      },
    },
  });

  console.log(`✅ Created/Updated subscriber: ${subscriber.email}`);
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
