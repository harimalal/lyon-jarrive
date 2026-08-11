// GET /api/items - List all items
// POST /api/items - Create a new item

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    if (request.method === 'GET') {
      const categoryId = url.searchParams.get('category_id');
      let items;
      if (categoryId) {
        items = await env.DB.prepare(
          'SELECT * FROM items WHERE category_id = ? ORDER BY created_at ASC'
        ).bind(categoryId).all();
      } else {
        items = await env.DB.prepare(
          'SELECT * FROM items ORDER BY created_at ASC'
        ).all();
      }
      return new Response(JSON.stringify(items.results), { headers });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const { id, category_id, name, cost, comment } = body;
      if (!id || !category_id || !name) {
        return new Response(JSON.stringify({ error: 'id, category_id, and name are required' }), { status: 400, headers });
      }
      await env.DB.prepare(
        'INSERT INTO items (id, category_id, name, cost, comment) VALUES (?, ?, ?, ?, ?)'
      ).bind(id, category_id, name, cost || 0, comment || '').run();
      const item = await env.DB.prepare('SELECT * FROM items WHERE id = ?').bind(id).first();
      return new Response(JSON.stringify(item), { status: 201, headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
