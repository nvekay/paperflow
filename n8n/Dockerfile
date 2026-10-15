# n8n with the Paperflow node and the workflows from git. The same image runs locally (docker compose) and on
# Hugging Face Spaces, where this folder is the Space repository. Run `pnpm n8n:prepare` before building: it copies
# the built node into ./nodes.
FROM docker.n8n.io/n8nio/n8n:2.43.5

COPY --chown=node:node nodes /opt/paperflow/nodes
COPY --chown=node:node workflows /opt/paperflow/workflows
COPY --chown=node:node --chmod=755 credentials.mjs entrypoint.sh /opt/paperflow/

# Hugging Face routes traffic to port 7860
ENV N8N_PORT=7860
ENV N8N_CUSTOM_EXTENSIONS=/opt/paperflow/nodes
# The workflows read SLACK_CHANNEL_ID and GOOGLE_SHEET_ID from the environment
ENV N8N_BLOCK_ENV_ACCESS_IN_NODE=false
ENV DB_TYPE=postgresdb GENERIC_TIMEZONE=UTC
ENV N8N_DIAGNOSTICS_ENABLED=false N8N_PERSONALIZATION_ENABLED=false N8N_VERSION_NOTIFICATIONS_ENABLED=false
# A week of executions is enough to debug and keeps the free Postgres small
ENV EXECUTIONS_DATA_PRUNE=true EXECUTIONS_DATA_MAX_AGE=168

EXPOSE 7860
ENTRYPOINT ["tini", "--", "/opt/paperflow/entrypoint.sh"]
