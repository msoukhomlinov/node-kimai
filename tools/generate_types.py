#!/usr/bin/env python3
"""
node-kimai SDK Generator - Types
Generates type files from OpenAPI spec.
"""

import json
import os
from pathlib import Path

ROOT = Path("/Users/maxs/gitrepos/node-kimai")
SPEC_PATH = "/Users/maxs/gitrepos/n8n/n8n-nodes-kimai-pro/api-docs-v1.1.json"
SRC = ROOT / "src"
TYPES_DIR = SRC / "types"

with open(SPEC_PATH) as f:
    spec = json.load(f)

schemas = spec.get("components", {}).get("schemas", {})
paths = spec.get("paths", {})


def ts_type_from_schema(name, schema, depth=0):
    if depth > 5:
        return "unknown"

    if "$ref" in schema:
        return schema["$ref"].split("/")[-1]

    if schema.get("type") == "array":
        items = schema.get("items", {})
        return f"{ts_type_from_schema(name + 'Item', items, depth + 1)}[]"

    if schema.get("type") == "object":
        if "properties" in schema:
            props = ", ".join(f"{k}: {ts_type_from_schema(name + k.capitalize(), v, depth + 1)}" for k, v in schema["properties"].items())
            return f"{{ {props} }}"
        return "Record<string, unknown>"

    if schema.get("type") == "string":
        if "enum" in schema:
            return " | ".join(f'"{v}"' for v in schema["enum"])
        return "string"

    type_map = {"integer": "number", "number": "number", "boolean": "boolean"}
    if schema.get("type") in type_map:
        return type_map[schema["type"]]

    if "oneOf" in schema or "anyOf" in schema:
        variants = schema.get("oneOf", schema.get("anyOf", []))
        return " | ".join(ts_type_from_schema(name + f"V{i}", s, depth + 1) for i, s in enumerate(variants))

    if "allOf" in schema:
        types = [ts_type_from_schema(name + f"Part{i}", s, depth + 1) for i, s in enumerate(schema["allOf"])]
        return " & ".join(types)

    return "unknown"


def generate_interface(name, schema):
    if name.endswith("Collection"):
        return None

    all_properties = {}
    all_required = set()

    if "allOf" in schema:
        for sub in schema["allOf"]:
            if "$ref" in sub:
                ref_name = sub["$ref"].split("/")[-1]
                ref_schema = schemas.get(ref_name, {})
                if "properties" in ref_schema:
                    all_properties.update(ref_schema["properties"])
                if "required" in ref_schema:
                    all_required.update(ref_schema["required"])
            elif "properties" in sub:
                all_properties.update(sub["properties"])
            if "required" in sub:
                all_required.update(sub["required"])
    else:
        all_properties = schema.get("properties", {})
        all_required = set(schema.get("required", []))

    if not all_properties:
        if "type" in schema:
            ts_type = ts_type_from_schema(name, schema)
            return f"export type {name} = {ts_type};\n"
        return None

    lines = [f"export interface {name} {{"]
    for prop_name, prop_schema in all_properties.items():
        required = prop_name in all_required
        ts_type = ts_type_from_schema(name + prop_name.capitalize(), prop_schema)
        ts_type = ts_type.replace("  ", " ").strip()
        optional = "" if required else "?"
        lines.append(f"  {prop_name}{optional}: {ts_type};")
    lines.append("}")
    return "\n".join(lines) + "\n"


def generate_types():
    resource_schemas = {
        "activity": ["Activity", "ActivityEntity", "ActivityExpanded", "ActivityEditForm", 
                     "ActivityMeta", "ActivityRate", "ActivityRateForm"],
        "customer": ["Customer", "CustomerEntity", "CustomerEditForm", "CustomerMeta",
                     "CustomerRate", "CustomerRateForm", "Comment", "CommentForm"],
        "project": ["Project", "ProjectEntity", "ProjectExpanded", "ProjectEditForm",
                    "ProjectMeta", "ProjectRate", "ProjectRateForm"],
        "timesheet": ["TimesheetEntity", "TimesheetExpanded", "TimesheetEditForm",
                      "TimesheetMeta", "TimesheetConfig"],
        "user": ["User", "UserEntity", "UserEditForm", "UserCreateForm", "UserPreference"],
        "tag": ["TagEntity", "TagEditForm"],
        "team": ["Team", "TeamMember", "TeamMembership", "TeamEditForm"],
        "invoice": ["Invoice", "InvoiceMeta"],
        "system": ["Version", "Plugin", "PageAction"],
    }

    for resource, schema_names in resource_schemas.items():
        content_lines = [f"// Generated types for {resource} resource", "// DO NOT EDIT MANUALLY", ""]

        for schema_name in schema_names:
            if schema_name not in schemas:
                print(f"  Warning: schema {schema_name} not found")
                continue

            interface = generate_interface(schema_name, schemas[schema_name])
            if interface:
                content_lines.append(interface)
                content_lines.append("")

        filepath = TYPES_DIR / f"{resource}.ts"
        with open(filepath, "w") as f:
            f.write("\n".join(content_lines))
        print(f"  Generated {filepath}")

    # approval_bundle types
    approval_lines = [
        "// Generated types for approval-bundle resource",
        "// DO NOT EDIT MANUALLY",
        "",
        "export interface ApprovalWeekStatus {",
        "  user: number;",
        "  date: string;",
        "  approved: boolean;",
        "  timesheets: number;",
        "  duration: number;",
        "}",
        "",
        "export interface ApprovalOvertimeYear {",
        "  user: number;",
        "  year: number;",
        "  totalOvertime: number;",
        "  weeks: ApprovalWeekOvertime[];",
        "}",
        "",
        "export interface ApprovalWeekOvertime {",
        "  date: string;",
        "  overtime: number;",
        "}",
        "",
        "export interface ApprovalWeeklyOvertime {",
        "  user: number;",
        "  date: string;",
        "  overtime: number;",
        "}",
    ]
    with open(TYPES_DIR / "approval_bundle.ts", "w") as f:
        f.write("\n".join(approval_lines) + "\n")
    print(f"  Generated {TYPES_DIR / 'approval_bundle.ts'}")

    # export types
    export_lines = [
        "// Generated types for export resource",
        "// DO NOT EDIT MANUALLY",
        "",
        "export interface ExportTemplate {",
        "  id: number;",
        "  name: string;",
        "}",
    ]
    with open(TYPES_DIR / "export.ts", "w") as f:
        f.write("\n".join(export_lines) + "\n")
    print(f"  Generated {TYPES_DIR / 'export.ts'}")

    # common types
    common_lines = [
        "// Shared types used across resources",
        "// DO NOT EDIT MANUALLY",
        "",
        "export interface ListParams {",
        "  page?: number;",
        "  size?: number;",
        "}",
        "",
        "export interface ActivityListParams {",
        "  name?: string;",
        "  visible?: boolean;",
        "  customer?: number;",
        "}",
        "",
        "export interface CustomerListParams {",
        "  name?: string;",
        "  visible?: boolean;",
        "}",
        "",
        "export interface ProjectListParams {",
        "  name?: string;",
        "  visible?: boolean;",
        "  customer?: number;",
        "  activity?: number;",
        "}",
        "",
        "export interface TimesheetListParams {",
        "  page?: number;",
        "  size?: number;",
        "  user?: string | number;",
        "  users?: number[];",
        "  begin?: string;",
        "  end?: string;",
        "  activity?: number;",
        "  project?: number;",
        "  customer?: number;",
        "  tag?: string;",
        "  exported?: boolean;",
        "}",
        "",
        "export interface UserListParams {",
        "  role?: string;",
        "  team?: number;",
        "}",
        "",
        "export interface InvoiceListParams {",
        "  page?: number;",
        "  size?: number;",
        "  customer?: number;",
        "}",
        "",
        "export interface TeamListParams {",
        "  name?: string;",
        "}",
    ]
    with open(TYPES_DIR / "common.ts", "w") as f:
        f.write("\n".join(common_lines) + "\n")
    print(f"  Generated {TYPES_DIR / 'common.ts'}")

    # types barrel
    barrel_lines = [
        "// Barrel export for all types",
        "// DO NOT EDIT MANUALLY",
        "",
        "export * from './activity';",
        "export * from './customer';",
        "export * from './project';",
        "export * from './timesheet';",
        "export * from './user';",
        "export * from './tag';",
        "export * from './team';",
        "export * from './invoice';",
        "export * from './approval_bundle';",
        "export * from './system';",
        "export * from './export';",
        "export * from './common';",
    ]
    with open(TYPES_DIR / "index.ts", "w") as f:
        f.write("\n".join(barrel_lines) + "\n")
    print(f"  Generated {TYPES_DIR / 'index.ts'}")


generate_types()
print("\nTypes generation complete!")
