# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-08-10

### Added

- Complete typed SDK for Kimai API v1.1 with 92 endpoints
- Resource clients: Activities, Customers, Projects, Timesheets, Users, Tags, Teams, Invoices, ApprovalBundle, Config, System, Export, Actions
- Full TypeScript support with strict mode — no `any` types
- Async iterable pagination for list endpoints
- Comprehensive error hierarchy (BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, UnprocessableEntityError, RateLimitError, ServerError)
- ESM and CJS builds with full type declarations
- MCP tool manifest for Kimai integration
- 194 unit tests with 100% code coverage
- Documentation: README, ARCHITECTURE.md, USAGE.md

### Notes

- Binary download endpoint (`/api/invoices/{id}/download`) excluded — not suitable for SDK
