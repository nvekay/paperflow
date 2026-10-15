#!/bin/sh
# Imports the credentials and workflows kept in git, then starts n8n. All state lives in Postgres, so a fresh
# container (a restarted Hugging Face Space has no disk) comes back with the same setup.
set -eu

node /opt/paperflow/credentials.mjs > /tmp/credentials.json
n8n import:credentials --input=/tmp/credentials.json
rm -f /tmp/credentials.json

n8n import:workflow --separate --input=/opt/paperflow/workflows
# Importing leaves workflows unpublished: the intake webhook must be live, and an error workflow runs only when published
n8n publish:workflow --id=pfIntake00000001
n8n publish:workflow --id=pfErrors00000001

exec n8n start
