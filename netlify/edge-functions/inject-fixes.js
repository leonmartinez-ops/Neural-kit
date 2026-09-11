export default async (request, context) => {
  const response = await context.next();
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return response;
  let html = await response.text();
  if (!html.includes('/neural-fixes.js')) {
    html = html.replace('</body>', '<script src="/neural-fixes.js?v=20260911-0217"></script></body>');
  } else {
    html = html.replace(/\/neural-fixes\.js\?v=[^"']+/g, '/neural-fixes.js?v=20260911-0217');
  }
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
};