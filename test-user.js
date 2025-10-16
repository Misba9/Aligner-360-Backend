const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testUser(email) {
  try {
    console.log(`Checking user with email: ${email}`);
    
    const user = await prisma.user.findUnique({
      where: { email: email },
    });
    
    if (!user) {
      console.log('User not found in database');
      return;
    }
    
    console.log('User found:');
    console.log('- ID:', user.id);
    console.log('- Email:', user.email);
    console.log('- First Name:', user.firstName);
    console.log('- Last Name:', user.lastName);
    console.log('- Is Email Verified:', user.isEmailVerified);
    console.log('- Is Active:', user.isActive);
    console.log('- Role:', user.role);
    console.log('- Created At:', user.createdAt);
    
    if (!user.isEmailVerified) {
      console.log('\nUser has not verified their email. Verification token expires at:', user.emailVerificationExpiry);
    }
    
  } catch (error) {
    console.error('Error checking user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.log('Usage: node test-user.js <email>');
  process.exit(1);
}

testUser(email);