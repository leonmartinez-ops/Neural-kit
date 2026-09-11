export default async (request, context) => {
  const response = await context.next();
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return response;
  let html = await response.text();
  const fixes = '<script src="/neural-fixes.js?v=20260911-1049"></script>';
  const ui3 = '<script src="/neural-ui-v3.js?v=20260911-1215"></script>';
  if (!html.includes('/neural-fixes.js')) html = html.replace('</body>', fixes + ui3 + '</body>');
  else {
    html = html.replace(/<script src="\/neural-fixes\.js\?v=[^"]+"><\/script>/g, fixes);
    if (!html.includes('/neural-ui-v3.js')) html = html.replace('</body>', ui3 + '</body>');
    else html = html.replace(/<script src="\/neural-ui-v3\.js\?v=[^"]+"><\/script>/g, ui3);
  }
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
};