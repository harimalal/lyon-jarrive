// POST /api/seed - Seed the database with initial data
export async function onRequest(context) {
  const { request, env } = context;
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  try {
    const body = await request.json();
    const { categories } = body;

    if (!categories || !Array.isArray(categories)) {
      return new Response(JSON.stringify({ error: 'categories array required' }), { status: 400, headers });
    }

    // Clear existing data
    await env.DB.prepare('DELETE FROM items').run();
    await env.DB.prepare('DELETE FROM categories').run();

    for (const cat of categories) {
      const result = await env.DB.prepare(
        'INSERT INTO categories (name, budget) VALUES (?, ?)'
      ).bind(cat.name, cat.budget).run();
      const categoryId = result.meta.last_row_id;

      for (const item of (cat.items || [])) {
        await env.DB.prepare(
          'INSERT INTO items (id, category_id, name, cost, comment, completed, priority) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(item.id, categoryId, item.name, item.cost, item.comment || '', item.completed ? 1 : 0, item.priority || 'P1').run();
      }
    }

    return new Response(JSON.stringify({ success: true, message: 'Database seeded' }), { headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
