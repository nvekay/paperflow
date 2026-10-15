# n8n-nodes-paperflow

An n8n community node for [Paperflow](https://github.com/nvekay/paperflow): Claude reads an invoice (PDF, scan or
phone photo), deterministic code checks it, and the workflow decides whether a person has to approve it.

## Operations

**Document → Extract.** Reads the document, runs the checks and returns the route (`auto_approve` or `review`), the
reasons, every extracted field, a review link and a row ready for Google Sheets. Options: the amount up to which clean
invoices are approved automatically (USD) and the minimum reading confidence. Calling it again for the same document
returns the stored result instead of paying for a second reading.

**Document → Get.** The document with its status, fields, checks and timeline.

**Document → Report Step.** Adds a step to the document's timeline on the Paperflow demo page. Some steps also move the
status: `review_requested` (pass `data.resumeUrl`, usually `{{ $execution.resumeUrl }}`), `recorded`, `rejected` and
`failed`.

## Credentials

**Paperflow API**: the URL of the Paperflow web app and its `PAPERFLOW_API_KEY`. The credential test calls
`/api/health`.

## Development

```bash
pnpm --filter n8n-nodes-paperflow build
pnpm --filter n8n-nodes-paperflow lint
```

`pnpm dev:n8n` at the repository root builds the node into the local n8n image together with the workflows that use
it.
