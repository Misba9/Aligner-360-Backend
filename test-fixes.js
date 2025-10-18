// Simple test script to verify our fixes
console.log('Testing error fixes...');

// Test 1: Check if environment variables are properly loaded
console.log('Checking environment variables...');
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'IMAGEKIT_PUBLIC_KEY',
  'IMAGEKIT_PRIVATE_KEY',
  'IMAGEKIT_URL_ENDPOINT'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.log('Missing environment variables:', missingEnvVars);
} else {
  console.log('All required environment variables are present');
}

// Test 2: Check if ImageKit service can be initialized
console.log('Testing ImageKit service initialization...');
try {
  const ImageKit = require('imagekit');
  
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  
  if (publicKey && privateKey && urlEndpoint) {
    const imagekit = new ImageKit({
      publicKey,
      privateKey,
      urlEndpoint,
    });
    console.log('ImageKit service initialized successfully');
  } else {
    console.log('ImageKit service cannot be initialized due to missing configuration');
  }
} catch (error) {
  console.log('Error initializing ImageKit service:', error.message);
}

console.log('Test completed.');