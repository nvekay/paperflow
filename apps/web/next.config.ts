import { existsSync } from 'node:fs';
import type { NextConfig } from 'next';

// One .env at the repo root serves the eval, n8n and this app; on Vercel the variables come from the project settings
if (existsSync('../../.env')) process.loadEnvFile('../../.env');

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    // Invoices up to 4 MB plus multipart overhead; Vercel caps request bodies at 4.5 MB anyway
    serverActions: { bodySizeLimit: '4.5mb' },
  },
};

export default nextConfig;
