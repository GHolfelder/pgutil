# pgutil

pgutil is a small collection of PostgreSQL utility modules for Deno. The first module included here is `Schema` — a helper for generating SQL statements for tables (create table, constraints, select, insert, update, delete) and related helpers.

Usage

1. Add the repository to your Deno project (via import map or direct URL). Example using an import map entry:

```json
{
  "imports": {
    "pgutil/": "https://raw.githubusercontent.com/<your-username>/pgutil/main/"
  }
}
```

2. Import the module in your project:

```ts
import { Schema } from "pgutil/mod.ts";
```

Generating docs

Use Deno's `deno doc` to generate HTML docs into the `doc/` folder:

```powershell
deno doc --json src/Schema.ts > doc/schema.json
deno doc --html --output=./doc src/Schema.ts
```

License

MIT
