#!/usr/bin/env node

/**
 * API Testing Script
 * Tests all API endpoints for the finance tracker
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

let authToken = null;

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(colors.green, `✓ ${message}`);
}

function error(message) {
  log(colors.red, `✗ ${message}`);
}

function info(message) {
  log(colors.blue, `ℹ ${message}`);
}

function section(message) {
  console.log();
  log(colors.cyan, `${'='.repeat(60)}`);
  log(colors.cyan, message);
  log(colors.cyan, `${'='.repeat(60)}`);
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken && !options.skipAuth) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err.message,
    };
  }
}

async function testLogin() {
  section('Testing Authentication - Login');

  info('Attempting login with correct credentials...');
  const result = await request('/api/auth/login', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({
      username: 'omrajpal',
      password: '13245678',
    }),
  });

  if (result.ok && result.data.success && result.data.token) {
    success('Login successful');
    authToken = result.data.token;
    info(`Token: ${authToken.substring(0, 20)}...`);
    return true;
  } else {
    error('Login failed');
    console.log(result.data);
    return false;
  }
}

async function testLoginInvalid() {
  info('Attempting login with invalid credentials...');
  const result = await request('/api/auth/login', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({
      username: 'wrong',
      password: 'wrong',
    }),
  });

  if (!result.ok && result.status === 401) {
    success('Invalid login correctly rejected');
    return true;
  } else {
    error('Invalid login should be rejected');
    return false;
  }
}

async function testVerify() {
  section('Testing Authentication - Verify');

  info('Verifying token...');
  const result = await request('/api/auth/verify', {
    method: 'GET',
  });

  if (result.ok && result.data.authenticated) {
    success('Token verification successful');
    info(`Username: ${result.data.username}`);
    return true;
  } else {
    error('Token verification failed');
    console.log(result.data);
    return false;
  }
}

async function testSheetsSync() {
  section('Testing Google Sheets Sync');

  info('Syncing data from Google Sheets...');
  const result = await request('/api/sheets/sync?force=true', {
    method: 'GET',
  });

  if (result.ok && result.data.success) {
    success(`Synced ${result.data.count} transactions`);
    info(`Last sync: ${result.data.lastSync}`);
    info(`Cached: ${result.data.cached}`);
    return true;
  } else {
    error('Sheets sync failed');
    console.log(result.data);
    return false;
  }
}

async function testTransactions() {
  section('Testing Transactions API');

  info('Fetching all transactions...');
  const result = await request('/api/transactions', {
    method: 'GET',
  });

  if (result.ok && result.data.success) {
    success(`Fetched ${result.data.count} transactions (Total: ${result.data.total})`);

    if (result.data.transactions.length > 0) {
      const sample = result.data.transactions[0];
      info('Sample transaction:');
      console.log({
        date: sample.date,
        description: sample.description,
        category: sample.category,
        amount: sample.amount,
      });
    }
    return true;
  } else {
    error('Transactions fetch failed');
    console.log(result.data);
    return false;
  }
}

async function testTransactionsFiltered() {
  info('Fetching filtered transactions (last 30 days)...');
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const result = await request(
    `/api/transactions?startDate=${startDate}&endDate=${endDate}&sort=amount&order=desc&limit=5`,
    { method: 'GET' }
  );

  if (result.ok && result.data.success) {
    success(`Filtered to ${result.data.count} transactions`);
    info('Filters applied:');
    console.log(result.data.filters);
    return true;
  } else {
    error('Filtered transactions fetch failed');
    return false;
  }
}

async function testLogout() {
  section('Testing Logout');

  info('Logging out...');
  const result = await request('/api/auth/logout', {
    method: 'POST',
  });

  if (result.ok && result.data.success) {
    success('Logout successful');
    authToken = null;
    return true;
  } else {
    error('Logout failed');
    return false;
  }
}

async function testUnauthorized() {
  info('Testing unauthorized access (should fail)...');
  const result = await request('/api/transactions', {
    method: 'GET',
  });

  if (!result.ok && result.status === 401) {
    success('Unauthorized access correctly rejected');
    return true;
  } else {
    error('Should reject unauthorized access');
    return false;
  }
}

async function runAllTests() {
  console.log();
  log(colors.yellow, '🚀 Finova API Test Suite');
  log(colors.yellow, `Testing: ${BASE_URL}`);

  const results = [];

  // Authentication tests
  results.push(await testLogin());
  results.push(await testLoginInvalid());
  results.push(await testVerify());

  // Data tests
  results.push(await testSheetsSync());
  results.push(await testTransactions());
  results.push(await testTransactionsFiltered());

  // Logout tests
  results.push(await testLogout());
  results.push(await testUnauthorized());

  // Summary
  section('Test Summary');
  const passed = results.filter(r => r).length;
  const failed = results.filter(r => !r).length;

  console.log();
  log(colors.green, `Passed: ${passed}`);
  log(colors.red, `Failed: ${failed}`);
  log(colors.cyan, `Total: ${results.length}`);
  console.log();

  if (failed === 0) {
    success('All tests passed! 🎉');
    process.exit(0);
  } else {
    error('Some tests failed');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(err => {
  error(`Test suite error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
