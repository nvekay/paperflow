import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  Icon,
  INodeProperties,
} from 'n8n-workflow';

export class PaperflowApi implements ICredentialType {
  name = 'paperflowApi';

  displayName = 'Paperflow API';

  icon: Icon = { light: 'file:../nodes/Paperflow/paperflow.svg', dark: 'file:../nodes/Paperflow/paperflow.dark.svg' };

  documentationUrl = 'https://github.com/nvekay/paperflow/tree/main/packages/n8n-nodes-paperflow#credentials';

  properties: INodeProperties[] = [
    {
      displayName: 'App URL',
      name: 'url',
      type: 'string',
      default: '',
      placeholder: 'https://paperflow.example.com',
      description: 'Where the Paperflow web app runs',
      required: true,
    },
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      description: 'The PAPERFLOW_API_KEY of the web app',
      required: true,
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.apiKey}}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.url.replace(/\\/+$/, "")}}',
      url: '/api/health',
    },
  };
}
