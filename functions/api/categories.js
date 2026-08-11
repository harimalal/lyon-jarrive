// GET /api/categories - List all categories with item counts
// POST /api/categories - Create a new category
// PUT /api/categories/:id - Update a category
// DELETE /api/categories/:id - Delete a category and its items

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/categories', '');
  const catId = path.replace(/^\//, '');

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
        if (catId) {
          const cat = await env.DB.prepare(
            'SELECT * FROM categories WHERE id = ?'
          ).bind(catId).first();
          if (!cat) return new Response(JSON.stringify(null), { headers });
          const items = await env.DB.prepare(
            'SELECT * FROM items WHERE category_id = ? ORDER BY created_at ASC'
          ).bind(catId).all();
          cat.items = items.results;
          return new Response(JSON.stringify(cat), { headers });
        }
        const categories = await env.DB.prepare(
          'SELECT * FROM categories ORDER BY created_at ASC'
        ).all();
        // Attach item counts
        for (const cat of categories.results) {
          const items = await env.DB.prepare(
            'SELECT * FROM items WHERE category_id = ? ORDER BY created_at ASC'
          ).bind(cat.id).all();
          cat.items = items.results;
        }
        return new Response(JSON.stringify(categories.results), { headers });
      }

      case 'POST': {
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

      case 'PUT': {
        if (!catId) {
          return new Response(JSON.stringify({ error: 'Category ID required' }), { status: 400, headers });
        }
        const body = await request.json();
        const { name, budget } = body;
        const updates = [];
        const params = [];
        if (name !== undefined) { updates.push('name = ?'); params.push(name); }
        if (budget !== undefined) { updates.push('budget = ?'); params.push(budget); }
        if (updates.length === 0) {
          return new Response(JSON.stringify({ error: 'No fields to update' }), { status: 400, headers });
        }
        params.push(catId);
        await env.DB.prepare(
          `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`
        ).bind(...params).run();
        const cat = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(catId).first();
        return new Response(JSON.stringify(cat), { headers });
      }

      case 'DELETE': {
        if (!catId) {
          return new Response(JSON.stringify({ error: 'Category ID required' }), { status: 400, headers });
        }
        await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(catId).run();
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
