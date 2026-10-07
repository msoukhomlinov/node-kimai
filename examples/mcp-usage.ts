// examples/mcp-usage.ts
// MCP server integration notes and patterns for node-kimai
//
// This file demonstrates how to use node-kimai as the data layer
// for an MCP (Model Context Protocol) server. It is NOT a complete
// MCP server implementation — adapt the patterns to your MCP framework.
//
// Key MCP-friendly characteristics of node-kimai:
// - Plain T / T[] returns (no envelope wrappers)
// - getAll() for one-shot complete reads
// - Typed, catchable errors with status codes
// - Zero runtime deps (lightweight for server processes)

import {
  ApiClient,
  ApiError,
  NotFoundError,
  ForbiddenError,
} from 'node-kimai';

// Create a singleton client (shared across MCP tool calls)
const kimai = new ApiClient({
  baseUrl: process.env.KIMAI_URL ?? 'https://kimai.example.com',
  token: process.env.KIMAI_TOKEN ?? 'your-api-token',
});

// --- Tool: list_activities ---
// Returns all activities as a flat array — ideal for LLM tool input
async function listActivities(): Promise<unknown> {
  const activities = await kimai.activities.getAll();
  return activities.map((a) => ({
    id: a.id,
    name: a.name,
    project: a.project,
    billable: a.billable,
  }));
}

// --- Tool: list_timesheets ---
// Uses getAll() to fetch all matching timesheets in one call
async function listTimesheets(params?: {
  user?: string | number;
  begin?: string;
  end?: string;
}): Promise<unknown> {
  const timesheets = await kimai.timesheets.getAll(params);
  // TimesheetEntity carries numeric activity/project ids (the Expanded variant
  // from the vendor API embeds the objects).
  return timesheets.map((t) => ({
    id: t.id,
    description: t.description,
    activity: t.activity,
    project: t.project,
    begin: t.begin,
    end: t.end,
    duration: t.duration,
  }));
}

// --- Tool: create_timesheet ---
// Creates a new timesheet entry and returns the created object
async function createTimesheet(params: {
  activity: number;
  project: number;
  description?: string;
  begin?: string;
}): Promise<unknown> {
  const entry = await kimai.timesheets.create(params);
  return {
    id: entry.id,
    description: entry.description,
    begin: entry.begin,
    message: 'Timesheet entry created',
  };
}

// --- Tool: stop_timesheet ---
// Stops a running timesheet
async function stopTimesheet(id: number): Promise<unknown> {
  const entry = await kimai.timesheets.stop(id);
  return {
    id: entry.id,
    end: entry.end,
    duration: entry.duration,
    message: 'Timesheet stopped',
  };
}

// --- Tool: get_user_info ---
// Get info about the current API key owner
async function getUserInfo(): Promise<unknown> {
  const user = await kimai.users.getMe();
  return {
    id: user.id,
    name: user.username ?? user.initials ?? 'unknown',
    email: user.email,
    teams: user.teams?.map((t) => t.name),
  };
}

// --- Error handling wrapper for MCP tools ---
function wrapToolError(err: unknown): { error: string; status?: number } {
  if (err instanceof NotFoundError) {
    return { error: 'Resource not found', status: 404 };
  }
  if (err instanceof ForbiddenError) {
    return { error: 'Insufficient permissions', status: 403 };
  }
  if (err instanceof ApiError) {
    return { error: `${err.status}: ${err.message}`, status: err.status };
  }
  return { error: String(err) };
}

// Example: wrapped tool call
async function safeListActivities() {
  try {
    return { result: await listActivities() };
  } catch (err) {
    return { error: wrapToolError(err) };
  }
}

// --- Export for use in your MCP server ---
export const tools = {
  listActivities,
  listTimesheets,
  createTimesheet,
  stopTimesheet,
  getUserInfo,
  safeListActivities,
};

// --- Notes for MCP Server Implementation ---
//
// 1. Tool schemas: Define JSON Schema for each tool's input parameters
//    matching the TypeScript types above.
//
// 2. Caching: Consider caching reference data (activities, projects,
//    customers) between tool calls. Use getAll() once and cache results.
//
// 3. Pagination: Prefer getAll() for tools that need complete data.
//    Use list() with filters for targeted queries.
//
// 4. Error reporting: Map ApiError subclasses to clear MCP error messages.
//    Include status codes for debugging.
//
// 5. Security: The SDK uses Bearer token auth. Ensure your MCP server
//    stores the Kimai token securely (env vars, secrets manager).
//
// 6. Transport: If running inside n8n, inject a custom HttpTransport
//    that uses n8n's httpRequest helper instead of native fetch.
