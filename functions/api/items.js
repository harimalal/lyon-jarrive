// GET /api/items - List all items (optionally filter by category)
// POST /api/items - Create a new item
// PUT /api/items/:id - Update an item
// DELETE /api/items/:id - Delete an item

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/items', '');
  const itemId = path.replace(/^\//, '');

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
    switch (request.method) {
      case 'GET': {
        if (itemId) {
          const item = await env.DB.prepare(
            'SELECT * FROM items WHERE id = ?'
          ).bind(itemId).first();
          return new Response(JSON.stringify(item || null), { headers });
        }
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

      case 'POST': {
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

      case 'PUT': {
        if (!itemId) {
          return new Response(JSON.stringify({ error: 'Item ID required' }), { status: 400, headers });
        }
        const body = await request.json();
        const { name, cost, comment, completed, category_id } = body;
        const updates = [];
        const params = [];
        if (name !== undefined) { updates.push('name = ?'); params.push(name); }
        if (cost !== undefined) { updates.push('cost = ?'); params.push(cost); }
        if (comment !== undefined) { updates.push('comment = ?'); params.push(comment); }
        if (completed !== undefined) { updates.push('completed = ?'); params.push(completed ? 1 : 0); }
        if (category_id !== undefined) { updates.push('category_id = ?'); params.push(category_id); }
        if (updates.length === 0) {
          return new Response(JSON.stringify({ error: 'No fields to update' }), { status: 400, headers });
        }
        params.push(itemId);
        await env.DB.prepare(
          `UPDATE items SET ${updates.join(', ')} WHERE id = ?`
        ).bind(...params).run();
        const item = await env.DB.prepare('SELECT * FROM items WHERE id = ?').bind(itemId).first();
        return new Response(JSON.stringify(item), { headers });
      }

      case 'DELETE': {
        if (!itemId) {
          return new Response(JSON.stringify({ error: 'Item ID required' }), { status: 400, headers });
        }
        await env.DB.prepare('DELETE FROM items WHERE id = ?').bind(itemId).run();
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
