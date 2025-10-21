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

Use Deno's `deno doc` to generate HTML docs into the `docs/` folder:

```powershell
deno doc --json src/Schema.ts > docs/schema.json
deno doc --html --output=./docs src/Schema.ts
```


GitHub Pages (automated)

This repository includes a GitHub Actions workflow that runs on push to `main`, generates HTML docs with `deno doc`, and commits them into the `docs/` folder on the `main` branch.

To expose the docs via GitHub Pages:

1. Push the repository to GitHub (create the repo if needed).
2. The action will generate or update the `docs/` directory on `main`.
3. In the GitHub repository settings -> Pages, set the source to the `main` branch and the folder to `/docs` and save. The site URL will be shown there.

Local generation helper

You can also generate docs locally using the included PowerShell script:

```powershell
.\scripts\gen_docs.ps1
```

License

MIT
