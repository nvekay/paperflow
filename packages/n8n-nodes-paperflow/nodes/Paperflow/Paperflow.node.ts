import type { INodeProperties, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

const forOperations = (...operation: string[]) => ({ show: { resource: ['document'], operation } });

const documentProperties: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: { show: { resource: ['document'] } },
    options: [
      {
        name: 'Extract',
        value: 'extract',
        description: 'Read an invoice with Claude, check the numbers and decide whether a person must approve it',
        action: 'Extract an invoice',
        routing: {
          // A scan the stronger model re-reads can take close to a minute
          request: { method: 'POST', url: '/api/extract', timeout: 120_000 },
        },
      },
      {
        name: 'Get',
        value: 'get',
        description: 'Get a document with its status, fields, checks and timeline',
        action: 'Get a document',
        routing: {
          request: { method: 'GET', url: '=/api/documents/{{encodeURIComponent($parameter.documentId)}}' },
        },
      },
      {
        name: 'Report Step',
        value: 'reportStep',
        description: "Add a step to the document's timeline; some steps also change its status",
        action: 'Report a workflow step',
        routing: {
          request: {
            method: 'POST',
            url: '=/api/documents/{{encodeURIComponent($parameter.documentId)}}/events',
          },
        },
      },
    ],
    default: 'extract',
  },
  {
    displayName: 'Document ID',
    name: 'documentId',
    type: 'string',
    required: true,
    default: '',
    placeholder: 'doc_…',
    description: 'The ID the intake webhook received',
    displayOptions: forOperations('extract'),
    routing: { send: { type: 'body', property: 'documentId' } },
  },
  {
    displayName: 'Document ID',
    name: 'documentId',
    type: 'string',
    required: true,
    default: '',
    placeholder: 'doc_…',
    description: 'The ID the intake webhook received',
    displayOptions: forOperations('get', 'reportStep'),
  },
  {
    displayName: 'Options',
    name: 'options',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    displayOptions: forOperations('extract'),
    options: [
      {
        displayName: 'Auto-Approve Up To (USD)',
        name: 'autoApproveMaxUsd',
        type: 'number',
        default: 5000,
        description: 'Invoices above this amount always wait for a person, however clean they are',
        routing: { send: { type: 'body', property: 'policy.autoApproveMaxUsd' } },
      },
      {
        displayName: 'Minimum Confidence',
        name: 'minConfidence',
        type: 'options',
        options: [
          { name: 'High', value: 'high', description: 'Every critical field was read with certainty' },
          { name: 'Medium', value: 'medium', description: 'One unclear field is acceptable' },
          { name: 'Low', value: 'low', description: 'Approve whenever all checks pass' },
        ],
        default: 'high',
        description: 'How sure the reading must be for an invoice to skip review',
        routing: { send: { type: 'body', property: 'policy.minConfidence' } },
      },
    ],
  },
  {
    displayName: 'Step',
    name: 'step',
    type: 'string',
    required: true,
    default: '',
    placeholder: 'recorded',
    description:
      'Short name of the step. These also change the status: review_requested (needs data.resumeUrl), recorded (data.sheetRow is shown), rejected, failed.',
    displayOptions: forOperations('reportStep'),
    routing: { send: { type: 'body', property: 'step' } },
  },
  {
    displayName: 'Status',
    name: 'status',
    type: 'options',
    options: [
      { name: 'Done', value: 'done' },
      { name: 'Failed', value: 'failed' },
      { name: 'Info', value: 'info' },
      { name: 'Waiting', value: 'waiting' },
    ],
    default: 'done',
    displayOptions: forOperations('reportStep'),
    routing: { send: { type: 'body', property: 'status' } },
  },
  {
    displayName: 'Message',
    name: 'message',
    type: 'string',
    required: true,
    default: '',
    placeholder: 'Added a row to Google Sheets',
    description: 'What the timeline shows for this step',
    displayOptions: forOperations('reportStep'),
    routing: { send: { type: 'body', property: 'message' } },
  },
  {
    displayName: 'Data',
    name: 'data',
    type: 'json',
    default: '{}',
    description: 'Extra details for the step, as a JSON object',
    displayOptions: forOperations('reportStep'),
    routing: {
      send: {
        type: 'body',
        property: 'data',
        value: '={{ typeof $value === "string" ? JSON.parse($value || "{}") : $value }}',
      },
    },
  },
];

export class Paperflow implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Paperflow',
    name: 'paperflow',
    icon: { light: 'file:paperflow.svg', dark: 'file:paperflow.dark.svg' },
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Read invoices with Claude, check them and report workflow steps to Paperflow',
    defaults: { name: 'Paperflow' },
    usableAsTool: true,
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    credentials: [{ name: 'paperflowApi', required: true }],
    requestDefaults: {
      baseURL: '={{$credentials.url.replace(/\\/+$/, "")}}',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    },
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [{ name: 'Document', value: 'document' }],
        default: 'document',
      },
      ...documentProperties,
    ],
  };
}
