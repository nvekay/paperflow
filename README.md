# Paperflow

Invoice processing with n8n and custom code. An invoice arrives as a PDF, a scan or a photo; n8n runs the workflow,
Claude reads the document into a strict schema, code checks that the numbers add up, a person approves anything
uncertain, and the result lands in Google Sheets.

> Work in progress. Done so far: the extraction core (`packages/extraction`) and local n8n on Postgres.

## Run locally

Requires Node 22+, pnpm and Docker.

```bash
pnpm install
cp .env.example .env     # works without an API key: a fake extractor returns sample data
pnpm dev:n8n             # n8n on http://localhost:5678 with its own Postgres database
pnpm test
```

## Layout

```
packages/extraction  Invoice schema, Claude extractor (PDF and images), deterministic checks, routing, cascade
docker/              Postgres init script (a second database for n8n)
```
