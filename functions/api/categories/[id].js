// GET /api/categories/:id - Get one category with items
// PUT /api/categories/:id - Update a category
// DELETE /api/categories/:id - Delete a category and its items

export async function onRequest(context) {
  const { request, env, params } = context;
  const catId = params.id;

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
      const cat = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(catId).first();
      if (!cat) return new Response(JSON.stringify(null), { headers });
      const items = await env.DB.prepare(
        'SELECT * FROM items WHERE category_id = ? ORDER BY created_at ASC'
      ).bind(catId).all();
      cat.items = items.results;
      return new Response(JSON.stringify(cat), { headers });
    }

    if (request.method === 'PUT') {
      const body = await request.json();
      const { name, budget } = body;
      const updates = [];
      const params_arr = [];
      if (name !== undefined) { updates.push('name = ?'); params_arr.push(name); }
      if (budget !== undefined) { updates.push('budget = ?'); params_arr.push(budget); }
      if (updates.length === 0) {
        return new Response(JSON.stringify({ error: 'No fields to update' }), { status: 400, headers });
      }
      params_arr.push(catId);
      await env.DB.prepare(
        `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`
      ).bind(...params_arr).run();
      const cat = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(catId).first();
      return new Response(JSON.stringify(cat), { headers });
    }

    if (request.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(catId).run();
      return new Response(JSON.stringify({ success: true }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
