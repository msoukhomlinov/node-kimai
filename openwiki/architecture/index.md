# Files

- [Build System and Dual Module Strategy](build-artifacts.md) - Explains the tsup-based build configuration, ESM-first dual module output, and package.json exports map for deep-import subpaths
- [Client Core and Transport Layer](client-core.md) - Explains the ApiClient base class, injectable transport abstraction, request lifecycle, timeout/cancellation handling, and error creation
- [Error Hierarchy and Structured Contract](error-handling.md) - Defines the typed error classes, error categories, structured error contract fields, and the status=0 convention for local refusals
- [Resource Client Architecture](resource-clients.md) - Documents the 13 resource client structure, naming patterns, pagination strategies (list/listAll/listPages), and the helper layer (resolve/search/getContext)
- [Type System and Schema Organization](type-system.md) - TypeScript type organization across 13 resources, naming conventions for entities/collections/forms, and the dual module export strategy
