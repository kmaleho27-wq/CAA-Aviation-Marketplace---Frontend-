// Shared CORS headers for Edge Functions called from the browser.
// Stripe webhooks bypass CORS (server-to-server), but include here for
// consistency in case someone tests via curl with --origin set.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

export function preflight(): Response {
  return new Response('ok', { headers: corsHeaders });
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

export function error(message: string, status = 400): Response {
  return json({ error: message }, { status });
}
