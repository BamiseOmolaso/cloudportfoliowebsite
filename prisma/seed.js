const { PrismaClient } = require('./generated/prisma')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  console.log('DB URL used by seed:', process.env.DATABASE_URL);

  const project1 = await prisma.project.create({
    data: {
      title: "Portfolio Website - AWS Infrastructure",
      slug: "portfolio-aws-infrastructure",
      content: "Complete DevOps portfolio showcasing AWS deployment with ECS Fargate, RDS, and Terraform IaC",
      excerpt: "Modern portfolio built with Next.js 14, deployed on AWS using containers",
      technologies: ["Next.js", "TypeScript", "AWS", "Terraform", "Docker", "PostgreSQL"],
      author: "Bamise Omolaso",
      status: "published",
      publishedAt: new Date(),
    },
  })

  const project2 = await prisma.project.create({
    data: {
      title: "Newsletter Management System",
      slug: "newsletter-system",
      content: "Complete newsletter system with subscriber management, tagging, and analytics",
      excerpt: "Built with Prisma, PostgreSQL, and Resend API",
      technologies: ["Prisma", "PostgreSQL", "Resend", "Next.js"],
      author: "Bamise Omolaso",
      status: "published",
      publishedAt: new Date(),
    },
  })

  console.log(`✅ Created project: ${project1.title}`)
  console.log(`✅ Created project: ${project2.title}`)

  const blogPost = await prisma.blogPost.create({
    data: {
      title: "Migrating from Vercel to AWS: A Complete Guide",
      slug: "migrating-vercel-to-aws",
      content: `# Migrating from Vercel to AWS

This is my journey migrating a Next.js application from Vercel to AWS ECS Fargate.

## Why AWS?

Learning DevOps and infrastructure as code...`,
      excerpt: "Complete guide to deploying Next.js on AWS with ECS and RDS",
      tags: ["AWS", "DevOps", "Next.js", "Terraform"],
      author: "Bamise Omolaso",
      status: "published",
      publishedAt: new Date(),
    },
  })

  console.log(`✅ Created blog post: ${blogPost.title}`)

  const subscriber = await prisma.newsletterSubscriber.create({
    data: {
      email: "test@example.com",
      name: "Test Subscriber",
      isSubscribed: true,
      preferences: {
        frequency: "weekly",
        categories: ["devops", "aws"]
      }
    },
  })

  console.log(`✅ Created subscriber: ${subscriber.email}`)
  console.log('🎉 Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })