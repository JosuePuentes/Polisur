import path from 'path';
import type { NextConfig } from 'next';

const isVercel = Boolean(process.env.VERCEL);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(!isVercel ? { output: 'standalone' as const } : {}),
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default nextConfig;
