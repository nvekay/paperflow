// Prints the n8n credentials the workflows use, built from environment variables (secrets on Hugging Face, .env
// locally). `n8n import:credentials` encrypts them with N8N_ENCRYPTION_KEY; the IDs match the workflow JSON.
const env = process.env;

function required(name) {
  if (!env[name]) throw new Error(`Set ${name}`);
  return env[name];
}

const credentials = [
  {
    id: 'pfPaperflowApi01',
    name: 'Paperflow API',
    type: 'paperflowApi',
    data: { url: required('PAPERFLOW_API_URL'), apiKey: required('PAPERFLOW_API_KEY') },
  },
  {
    id: 'pfWebhookSecret1',
    name: 'Paperflow webhook secret',
    type: 'httpHeaderAuth',
    data: { name: 'x-paperflow-secret', value: required('N8N_WEBHOOK_SECRET') },
  },
];

// Slack and Google are optional until they are set up; the steps that need them fail and report it
if (env.SLACK_BOT_TOKEN) {
  credentials.push({
    id: 'pfSlackBot000001',
    name: 'Slack bot',
    type: 'slackApi',
    data: { accessToken: env.SLACK_BOT_TOKEN },
  });
}
if (env.GOOGLE_SA_EMAIL && env.GOOGLE_SA_PRIVATE_KEY) {
  credentials.push({
    id: 'pfGoogleSheets01',
    name: 'Google service account',
    type: 'googleApi',
    data: {
      email: env.GOOGLE_SA_EMAIL,
      // Stored on one line in .env and in Space secrets
      privateKey: env.GOOGLE_SA_PRIVATE_KEY.replace(/\\n/g, '\n'),
      inpersonate: false,
      httpNode: false,
    },
  });
}

process.stdout.write(JSON.stringify(credentials));
