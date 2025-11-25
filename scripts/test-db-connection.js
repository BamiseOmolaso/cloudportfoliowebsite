// Load .env.local first (if it exists), then fall back to .env
require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // This will load .env if .env.local doesn't override it

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    console.log('');
    
    // Check which env file was loaded
    const fs = require('fs');
    const path = require('path');
    const envLocalPath = path.join(process.cwd(), '.env.local');
    const envPath = path.join(process.cwd(), '.env');
    
    if (fs.existsSync(envLocalPath)) {
      console.log('📝 Loaded environment from: .env.local');
    } else if (fs.existsSync(envPath)) {
      console.log('📝 Loaded environment from: .env');
    } else {
      console.log('⚠️  No .env.local or .env file found');
    }
    
    console.log('');
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error('❌ DATABASE_URL is not set!');
      console.error('   Please check your .env.local or .env file');
      process.exit(1);
    }
    
    // Mask password in output for security
    const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':***@');
    console.log('🔗 DATABASE_URL:', maskedUrl);
    console.log('');
    
    console.log('⏳ Connecting to database...');
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    console.log('');
    
    console.log('📊 Querying PostgreSQL version...');
    const result = await prisma.$queryRaw`SELECT version()`;
    const version = result[0]?.version || result[0] || result;
    console.log('✅ PostgreSQL version:', version);
    console.log('');
    
    // Test a simple query
    console.log('🧪 Testing a simple query...');
    const tableCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('✅ Query successful!');
    console.log(`   Found ${tableCount[0]?.count || 'unknown'} tables in public schema`);
    console.log('');
    
    await prisma.$disconnect();
    console.log('✅ Connection closed successfully');
    console.log('');
    console.log('🎉 All database tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Database connection failed!');
    console.error('');
    console.error('Error message:', error.message);
    console.error('');
    
    if (error.code === 'P1000') {
      console.error('💡 This is an authentication error. Check:');
      console.error('   1. Database credentials in .env.local');
      console.error('   2. Database server is running');
      console.error('   3. Database exists and user has permissions');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 Connection refused. Check:');
      console.error('   1. Database server is running');
      console.error('   2. Host and port are correct in DATABASE_URL');
    } else {
      console.error('Full error details:', error);
    }
    
    console.error('');
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
}

testConnection();

