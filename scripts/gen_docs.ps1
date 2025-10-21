$ErrorActionPreference = 'Stop'

Write-Host "Generating docs into ./docs..."
deno doc --html --output=./docs src/Schema.ts
Write-Host "Docs generated into ./docs"
