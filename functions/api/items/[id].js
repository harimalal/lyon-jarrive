// GET /api/items/:id - Get one item
// PUT /api/items/:id - Update an item
// DELETE /api/items/:id - Delete an item

export async function onRequest(context) {
  const { request, env, params } = context;
  const itemId = params.id;

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
      const item = await env.DB.prepare('SELECT * FROM items WHERE id = ?').bind(itemId).first();
      return new Response(JSON.stringify(item || null), { headers });
    }

    if (request.method === 'PUT') {
      const body = await request.json();
      const { name, cost, comment, completed, category_id } = body;
      const updates = [];
      const params_arr = [];
      if (name !== undefined) { updates.push('name = ?'); params_arr.push(name); }
      if (cost !== undefined) { updates.push('cost = ?'); params_arr.push(cost); }
      if (comment !== undefined) { updates.push('comment = ?'); params_arr.push(comment); }
      if (completed !== undefined) { updates.push('completed = ?'); params_arr.push(completed ? 1 : 0); }
      if (category_id !== undefined) { updates.push('category_id = ?'); params_arr.push(category_id); }
      if (updates.length === 0) {
        return new Response(JSON.stringify({ error: 'No fields to update' }), { status: 400, headers });
      }
      params_arr.push(itemId);
      await env.DB.prepare(
        `UPDATE items SET ${updates.join(', ')} WHERE id = ?`
      ).bind(...params_arr).run();
      const item = await env.DB.prepare('SELECT * FROM items WHERE id = ?').bind(itemId).first();
      return new Response(JSON.stringify(item), { headers });
    }

    if (request.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM items WHERE id = ?').bind(itemId).run();
      return new Response(JSON.stringify({ success: true }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
