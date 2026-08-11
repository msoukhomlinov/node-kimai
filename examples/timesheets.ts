// examples/timesheets.ts
// Timesheet management with the node-kimai SDK

import { ApiClient, ApiError, NotFoundError } from 'node-kimai';

async function main() {
  const client = new ApiClient({
    baseUrl: process.env.KIMAI_URL ?? 'https://kimai.example.com',
    token: process.env.KIMAI_TOKEN ?? 'your-api-token',
  });

  // Get a project and activity to use
  const projects = await client.projects.getAll();
  const activities = await client.activities.getAll();

  if (projects.length === 0 || activities.length === 0) {
    console.log('No projects or activities found. Create some first.');
    return;
  }

  const project = projects[0];
  const activity = activities[0];

  console.log(`Using project "${project.name}" (${project.id}) and activity "${activity.name}" (${activity.id})`);

  // --- Start a timesheet entry ---
  const entry = await client.timesheets.create({
    activity: activity.id!,
    project: project.id!,
    description: 'Working on node-kimai documentation',
  });
  console.log('Started timesheet entry', entry.id);

  // --- Check active timesheets ---
  const active = await client.timesheets.getActive();
  console.log('Active timesheets:', active.length);

  // --- Stop the entry ---
  const stopped = await client.timesheets.stop(entry.id!);
  console.log('Stopped entry:', stopped.id);
  console.log('Duration:', (stopped.duration! / 1000 / 60).toFixed(1), 'minutes');

  // --- Add custom fields ---
  await client.timesheets.updateMeta(entry.id!, {
    ticket: 'DOCS-123',
    client: 'Internal',
  });
  console.log('Added custom fields');

  // --- Duplicate the entry ---
  const copy = await client.timesheets.duplicate(entry.id!);
  console.log('Duplicated entry:', copy.id);

  // --- Toggle export flag ---
  await client.timesheets.toggleExport(copy.id!);
  console.log('Toggled export flag on copy');

  // --- List recent timesheets ---
  const recent = await client.timesheets.getRecent();
  console.log('Recent timesheets:', recent.length);

  // --- Fetch all timesheets for a date range ---
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const weekStart = startOfWeek.toISOString().split('T')[0];

  const weekTimesheets = await client.timesheets.getAll({
    begin: weekStart,
  });
  console.log(`Timesheets this week: ${weekTimesheets.length}`);

  // --- Iterate over pages (for large datasets) ---
  let count = 0;
  for await (const page of client.timesheets.listPages({ size: 50 })) {
    count += page.length;
  }
  console.log(`Total timesheets (all pages): ${count}`);

  // --- Cleanup: delete the test entries ---
  await client.timesheets.delete(copy.id!);
  await client.timesheets.delete(entry.id!);
  console.log('Cleaned up test entries');
}

main().catch((err) => {
  if (err instanceof ApiError) {
    console.error(`API Error (${err.status}):`, err.message);
  } else {
    console.error(err);
  }
});
