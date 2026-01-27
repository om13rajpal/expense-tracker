#!/usr/bin/env node

/**
 * Generate a secure JWT secret key
 * Usage: node scripts/generate-secret.js
 */

import crypto from 'node:crypto';

// Generate a 64-byte (512-bit) random secret
const secret = crypto.randomBytes(64).toString('base64');

console.log('\n✅ Generated JWT Secret Key:\n');
console.log('━'.repeat(80));
console.log(secret);
console.log('━'.repeat(80));
console.log('\n📝 Add this to your .env.local file:\n');
console.log(`JWT_SECRET=${secret}`);
console.log('\n⚠️  Keep this secret secure and never commit it to version control!\n');
