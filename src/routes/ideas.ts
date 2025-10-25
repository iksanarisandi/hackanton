import { Hono } from 'hono';
import { Env, Idea, Attachment } from '../types';

const ideas = new Hono<{ Bindings: Env }>();

ideas.get('/', async (c) => {
  const userId = c.get('userId');
  const page = parseInt(c.req.query('page') || '1');
  const limit = 10;
  const offset = (page - 1) * limit;
  const search = c.req.query('search') || '';
  const status = c.req.query('status') || '';
  const tag = c.req.query('tag') || '';

  try {
    let query = 'SELECT * FROM ideas WHERE user_id = ?';
    const params: any[] = [userId];

    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (tag) {
      query += ' AND tags LIKE ?';
      params.push(`%${tag}%`);
    }

    query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const ideasResult = await c.env.DB.prepare(query).bind(...params).all<Idea>();

    const countQuery = 'SELECT COUNT(*) as total FROM ideas WHERE user_id = ?' + 
      (search ? ' AND (title LIKE ? OR description LIKE ?)' : '') +
      (status ? ' AND status = ?' : '') +
      (tag ? ' AND tags LIKE ?' : '');
    
    const countParams = [userId];
    if (search) countParams.push(`%${search}%`, `%${search}%`);
    if (status) countParams.push(status);
    if (tag) countParams.push(`%${tag}%`);

    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first<{ total: number }>();
    const total = countResult?.total || 0;

    const ideasWithAttachments = await Promise.all(
      ideasResult.results.map(async (idea) => {
        const attachments = await c.env.DB.prepare(
          'SELECT COUNT(*) as count FROM attachments WHERE idea_id = ?'
        ).bind(idea.id).first<{ count: number }>();
        
        return {
          ...idea,
          attachment_count: attachments?.count || 0
        };
      })
    );

    return c.json({
      ideas: ideasWithAttachments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get ideas error:', error);
    return c.json({ error: 'Failed to fetch ideas' }, 500);
  }
});

ideas.post('/', async (c) => {
  const userId = c.get('userId');

  try {
    const { title, description, tags, status } = await c.req.json();

    if (!title || title.trim() === '') {
      return c.json({ error: 'Title is required' }, 400);
    }

    const validStatuses = ['draft', 'in_progress', 'ready', 'published'];
    if (status && !validStatuses.includes(status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    const result = await c.env.DB.prepare(
      'INSERT INTO ideas (user_id, title, description, tags, status) VALUES (?, ?, ?, ?, ?)'
    ).bind(
      userId,
      title.trim(),
      description || null,
      tags || null,
      status || 'draft'
    ).run();

    const ideaId = result.meta.last_row_id;
    const idea = await c.env.DB.prepare('SELECT * FROM ideas WHERE id = ?').bind(ideaId).first<Idea>();

    return c.json({ message: 'Idea created successfully', idea }, 201);
  } catch (error) {
    console.error('Create idea error:', error);
    return c.json({ error: 'Failed to create idea' }, 500);
  }
});

ideas.get('/:id', async (c) => {
  const userId = c.get('userId');
  const ideaId = c.req.param('id');

  try {
    const idea = await c.env.DB.prepare(
      'SELECT * FROM ideas WHERE id = ? AND user_id = ?'
    ).bind(ideaId, userId).first<Idea>();

    if (!idea) {
      return c.json({ error: 'Idea not found' }, 404);
    }

    const attachments = await c.env.DB.prepare(
      'SELECT * FROM attachments WHERE idea_id = ? ORDER BY created_at DESC'
    ).bind(ideaId).all<Attachment>();

    const daysSinceCreated = Math.floor(
      (new Date().getTime() - new Date(idea.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    return c.json({
      idea,
      attachments: attachments.results,
      stats: { daysSinceCreated }
    });
  } catch (error) {
    console.error('Get idea error:', error);
    return c.json({ error: 'Failed to fetch idea' }, 500);
  }
});

ideas.put('/:id', async (c) => {
  const userId = c.get('userId');
  const ideaId = c.req.param('id');

  try {
    const idea = await c.env.DB.prepare(
      'SELECT * FROM ideas WHERE id = ? AND user_id = ?'
    ).bind(ideaId, userId).first<Idea>();

    if (!idea) {
      return c.json({ error: 'Idea not found' }, 404);
    }

    const { title, description, tags, status } = await c.req.json();

    if (title !== undefined && title.trim() === '') {
      return c.json({ error: 'Title cannot be empty' }, 400);
    }

    const validStatuses = ['draft', 'in_progress', 'ready', 'published'];
    if (status && !validStatuses.includes(status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    await c.env.DB.prepare(
      'UPDATE ideas SET title = ?, description = ?, tags = ?, status = ?, updated_at = datetime("now") WHERE id = ?'
    ).bind(
      title !== undefined ? title.trim() : idea.title,
      description !== undefined ? description : idea.description,
      tags !== undefined ? tags : idea.tags,
      status !== undefined ? status : idea.status,
      ideaId
    ).run();

    const updatedIdea = await c.env.DB.prepare('SELECT * FROM ideas WHERE id = ?').bind(ideaId).first<Idea>();

    return c.json({ message: 'Idea updated successfully', idea: updatedIdea });
  } catch (error) {
    console.error('Update idea error:', error);
    return c.json({ error: 'Failed to update idea' }, 500);
  }
});

ideas.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const ideaId = c.req.param('id');

  try {
    const idea = await c.env.DB.prepare(
      'SELECT * FROM ideas WHERE id = ? AND user_id = ?'
    ).bind(ideaId, userId).first<Idea>();

    if (!idea) {
      return c.json({ error: 'Idea not found' }, 404);
    }

    const attachments = await c.env.DB.prepare(
      'SELECT * FROM attachments WHERE idea_id = ?'
    ).bind(ideaId).all<Attachment>();

    for (const attachment of attachments.results) {
      const fileKey = attachment.file_url.split('/').pop();
      if (fileKey) {
        await c.env.BUCKET.delete(fileKey);
      }
    }

    await c.env.DB.prepare('DELETE FROM attachments WHERE idea_id = ?').bind(ideaId).run();
    await c.env.DB.prepare('DELETE FROM ideas WHERE id = ?').bind(ideaId).run();

    return c.json({ message: 'Idea deleted successfully' });
  } catch (error) {
    console.error('Delete idea error:', error);
    return c.json({ error: 'Failed to delete idea' }, 500);
  }
});

export default ideas;
