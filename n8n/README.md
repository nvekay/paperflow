# Paperflow n8n

n8n 2.43.5 with the [Paperflow node](../packages/n8n-nodes-paperflow) and the workflows from [`workflows/`](workflows).
The same image runs locally (`pnpm dev:n8n`) and on Render: GitHub Actions builds it, pushes it to
`ghcr.io/nvekay/paperflow-n8n` and asks Render to deploy it ([`deploy-n8n.yml`](../.github/workflows/deploy-n8n.yml)).

On start, [`entrypoint.sh`](entrypoint.sh) imports the credentials (built from environment variables by
[`credentials.mjs`](credentials.mjs)) and the workflows, publishes them, and starts n8n. Everything n8n stores lives in
Postgres, so a redeployed or restarted service comes back exactly as it was.

A free Render instance sleeps after 15 minutes without traffic;
[`keep-alive.yml`](../.github/workflows/keep-alive.yml) pings it every 10 minutes so visitors and resumed reviews
don't wait for it to wake.

## Environment

| Variable                                                                | What it is                                                        |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `DB_POSTGRESDB_HOST`, `_DATABASE`, `_USER`, `_PASSWORD`, `_SSL_ENABLED` | Postgres for n8n's own data (Neon in production)                  |
| `N8N_ENCRYPTION_KEY`                                                    | Encrypts the stored credentials; keep it stable                   |
| `N8N_WEBHOOK_URL`, `N8N_EDITOR_BASE_URL`                                | Public URL of this n8n, used in webhook and resume URLs           |
| `N8N_PROXY_HOPS=1`                                                      | Render serves the service through a proxy                         |
| `PORT=5678`                                                             | Tells Render which port n8n listens on                            |
| `PAPERFLOW_API_URL`, `PAPERFLOW_API_KEY`                                | The Paperflow web app and the key n8n calls it with               |
| `N8N_WEBHOOK_SECRET`                                                    | The `x-paperflow-secret` header the intake webhook requires       |
| `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID`                                   | Bot with `chat:write`, and the channel reviewers watch            |
| `GOOGLE_SA_EMAIL`, `GOOGLE_SA_PRIVATE_KEY`, `GOOGLE_SHEET_ID`           | Service account with the Sheets API, and the sheet shared with it |

## Editing the workflows

Change them in the local editor at http://localhost:5678, then run `pnpm n8n:export` to write them back to
`workflows/` without timestamps and version IDs.
