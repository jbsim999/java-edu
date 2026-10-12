import { handleApi } from '../server/executor.mjs';
import { assets } from './assets.generated.mjs';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, { ...env, REQUIRE_IDENTITY: true, TRUSTED_IDENTITY_HEADER: 'oai-authenticated-user-id' });
    }
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
    const asset = assets[pathname];
    if (!asset) return new Response('Not found', { status: 404 });
    return new Response(request.method === 'HEAD' ? null : asset.body, {
      headers: {
        'Content-Type': asset.type,
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; font-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'",
      },
    });
  },
};
