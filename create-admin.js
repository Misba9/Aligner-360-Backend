const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    const email = 'admin@example.com';
    const password = 'Admin123!';
    const firstName = 'Admin';
    const lastName = 'User';
    
    console.log(`Creating admin user with email: ${email}`);
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });
    
    if (existingUser) {
      console.log('Admin user already exists');
      console.log('- Email:', existingUser.email);
      console.log('- First Name:', existingUser.firstName);
      console.log('- Last Name:', existingUser.lastName);
      console.log('- Role:', existingUser.role);
      console.log('- Email Verified:', existingUser.isEmailVerified ? 'Yes' : 'No');
      return existingUser;
    }
    
    // Hash the password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create the admin user
    const user = await prisma.user.create({
      data: {
        email: email,
        password: hashedPassword,
        firstName: firstName,
        lastName: lastName,
        role: 'admin',
        phone: '1234567890',
        isEmailVerified: true,
        isActive: true,
      },
    });
    
    console.log('Admin user created successfully:');
    console.log('- ID:', user.id);
    console.log('- Email:', user.email);
    console.log('- First Name:', user.firstName);
    console.log('- Last Name:', user.lastName);
    console.log('- Role:', user.role);
    console.log('- Email Verified:', user.isEmailVerified ? 'Yes' : 'No');
    
    return user;
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();