// GET /api/categories - List all categories with items
// POST /api/categories - Create a new category

export async function onRequest(context) {
  const { request, env } = context;

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
      const categories = await env.DB.prepare(
        'SELECT * FROM categories ORDER BY created_at ASC'
      ).all();
      for (const cat of categories.results) {
        const items = await env.DB.prepare(
          'SELECT * FROM items WHERE category_id = ? ORDER BY created_at ASC'
        ).bind(cat.id).all();
        cat.items = items.results;
      }
      return new Response(JSON.stringify(categories.results), { headers });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const { name, budget } = body;
      if (!name) {
        return new Response(JSON.stringify({ error: 'name is required' }), { status: 400, headers });
      }
      const result = await env.DB.prepare(
        'INSERT INTO categories (name, budget) VALUES (?, ?)'
      ).bind(name, budget || 50).run();
      const cat = await env.DB.prepare(
        'SELECT * FROM categories WHERE id = ?'
      ).bind(result.meta.last_row_id).first();
      cat.items = [];
      return new Response(JSON.stringify(cat), { status: 201, headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
