// examples/quickstart.ts
// Basic usage of the node-kimai SDK

import { ApiClient, ApiError, NotFoundError } from 'node-kimai';

async function main() {
  // Create the client
  const client = new ApiClient({
    baseUrl: process.env.KIMAI_URL ?? 'https://kimai.example.com',
    token: process.env.KIMAI_TOKEN ?? 'your-api-token',
  });

  // Health check
  const alive = await client.system.ping();
  if (!alive) {
    console.error('Kimai is not reachable');
    process.exit(1);
  }

  // Version info
  const version = await client.system.getVersion();
  console.log('Connected to Kimai', version.version);

  // List activities
  const activities = await client.activities.getAll();
  console.log(`Found ${activities.length} activities`);

  // Create a new activity
  const newActivity = await client.activities.create({
    name: 'My First Activity',
    billable: true,
  });
  console.log('Created activity:', newActivity.name, '(id:', newActivity.id, ')');

  // List timesheets for today
  const today = new Date().toISOString().split('T')[0];
  const timesheets = await client.timesheets.list({
    begin: today,
  });
  console.log(`Found ${timesheets.length} timesheets for ${today}`);

  // Get current user
  const me = await client.users.getMe();
  console.log('Logged in as:', me.alias ?? me.username);

  // Error handling example
  try {
    await client.activities.getById(999999);
  } catch (err) {
    if (err instanceof NotFoundError) {
      console.log('Activity not found (expected)');
    } else if (err instanceof ApiError) {
      console.error('API error:', err.status, err.message);
    } else {
      throw err;
    }
  }
}

main().catch(console.error);
