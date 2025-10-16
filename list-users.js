const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listUsers() {
  try {
    console.log('Listing all users in the database:');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isEmailVerified: true,
        isActive: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    if (users.length === 0) {
      console.log('No users found in the database');
      return;
    }
    
    console.log(`Found ${users.length} user(s):`);
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
      console.log('   - ID:', user.id);
      console.log('   - Role:', user.role);
      console.log('   - Email Verified:', user.isEmailVerified ? 'Yes' : 'No');
      console.log('   - Active:', user.isActive ? 'Yes' : 'No');
      console.log('   - Created:', user.createdAt);
    });
    
  } catch (error) {
    console.error('Error listing users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();