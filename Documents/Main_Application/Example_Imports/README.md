### Tasky Example Imports

This folder contains sample task lists in multiple formats for bulk import into Tasky.

## Files

- `development-tasks.csv`
- `development-tasks.json`
- `development-tasks.yaml`
- `development-tasks.xml`

All examples share the same logical fields:

- `title` (required)
- `description` (optional)
- `assignedAgent` (optional; only `claude` or `gemini` are used; other values are ignored)
- `affectedFiles` (optional)
- `executionPath` (optional)

Notes:

- Import currently maps only the fields above. Other fields (like `tags`, `dueDate`) are ignored by the bulk import helper.
- `affectedFiles` can be a list (JSON/YAML/XML) or a pipe‑separated string (CSV: `path|path|path`).

## Format specifics

### CSV

Header must include: `title,description,assignedAgent,affectedFiles,executionPath`.

- `affectedFiles`: pipe‑separated string, e.g. `src/a.ts|src/b.ts`.
- Quotes are supported around column values.

### JSON

Array of objects. Example keys:

```json
{
  "title": "Refactor authentication middleware",
  "description": "...",
  "assignedAgent": "claude",
  "affectedFiles": ["src/a.ts", "src/b.ts"],
  "executionPath": "src/middleware"
}
```

### YAML

Top‑level sequence of objects with the same keys as JSON.

### XML

Root `<tasks>` with repeated `<task>` elements. Multiple `<affectedFiles>` tags are supported.

## How to import

Use the app’s IPC import endpoint with a file path:

```ts
// From the renderer (DevTools console or your code)
await window.electronAPI.invoke('task:import', {
  filePath: 'Documents/MAIN/Example_imports/development-tasks.csv'
});
```

You can point to any of the four files; the importer auto‑detects by extension:

- JSON: `Documents/MAIN/Example_imports/development-tasks.json`
- CSV: `Documents/MAIN/Example_imports/development-tasks.csv`
- YAML: `Documents/MAIN/Example_imports/development-tasks.yaml`
- XML: `Documents/MAIN/Example_imports/development-tasks.xml`

Alternatively, you can provide a structured payload (advanced):

```ts
await window.electronAPI.invoke('task:import', {
  tasks: [ { title: 'Example', description: '...', assignedAgent: 'claude', affectedFiles: ['src/a.ts'], executionPath: 'src' } ]
});
```

## Field handling and normalization

- `assignedAgent`: only `claude` or `gemini` are respected. Any other value (e.g., `auto`, `openai`) is ignored. OpenAI is not an execution agent here.
- `affectedFiles`:
  - CSV: split on `|`
  - JSON/YAML: string array
  - XML: multiple `<affectedFiles>` entries
- `executionPath`: if relative, it is resolved against the app’s working directory at runtime.

## Limitations

- Bulk import helper does not set `dueDate`, `tags`, or reminder fields. You can update tasks after import to add those.
- Title is required; rows without a non‑empty `title` are skipped.

## Troubleshooting

- Nothing imported: confirm the file path is correct relative to the project root.
- Some rows skipped: likely missing `title` or invalid `assignedAgent`.
- Paths don’t resolve: ensure `executionPath` is valid for your local project.


