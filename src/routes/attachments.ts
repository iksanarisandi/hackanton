import { Hono } from 'hono';
import { Env, Attachment, Idea } from '../types';
import { generateFileName, isValidFileType } from '../utils/r2';

const attachments = new Hono<{ Bindings: Env }>();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

attachments.post('/add-url', async (c) => {
  const userId = c.get('userId');

  try {
    const { idea_id, url, title } = await c.req.json();

    if (!url || !idea_id) {
      return c.json({ error: 'URL and idea_id are required' }, 400);
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return c.json({ error: 'Invalid URL format' }, 400);
    }

    const idea = await c.env.DB.prepare(
      'SELECT * FROM ideas WHERE id = ? AND user_id = ?'
    ).bind(idea_id, userId).first<Idea>();

    if (!idea) {
      return c.json({ error: 'Idea not found or access denied' }, 404);
    }

    const fileName = title || url;

    const result = await c.env.DB.prepare(
      'INSERT INTO attachments (idea_id, file_name, file_url, size, type) VALUES (?, ?, ?, ?, ?)'
    ).bind(idea_id, fileName, url, 0, 'url').run();

    const attachmentId = result.meta.last_row_id;
    const attachment = await c.env.DB.prepare(
      'SELECT * FROM attachments WHERE id = ?'
    ).bind(attachmentId).first<Attachment>();

    return c.json({
      message: 'URL added successfully',
      attachment
    }, 201);
  } catch (error) {
    console.error('Add URL error:', error);
    return c.json({ error: 'Failed to add URL' }, 500);
  }
});

attachments.post('/upload', async (c) => {
  const userId = c.get('userId');

  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const ideaId = formData.get('idea_id') as string;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    if (!ideaId) {
      return c.json({ error: 'idea_id is required' }, 400);
    }

    const idea = await c.env.DB.prepare(
      'SELECT * FROM ideas WHERE id = ? AND user_id = ?'
    ).bind(ideaId, userId).first<Idea>();

    if (!idea) {
      return c.json({ error: 'Idea not found or access denied' }, 404);
    }

    if (file.size > MAX_FILE_SIZE) {
      return c.json({ error: 'File size exceeds 10MB limit' }, 400);
    }

    if (!isValidFileType(file.name)) {
      return c.json({ error: 'Invalid file type' }, 400);
    }

    const fileName = generateFileName(file.name);
    const arrayBuffer = await file.arrayBuffer();

    await c.env.BUCKET.put(fileName, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Use custom domain for R2 file access
    const fileUrl = `https://adaide.akses.digital/files/${fileName}`;

    const result = await c.env.DB.prepare(
      'INSERT INTO attachments (idea_id, file_name, file_url, size, type) VALUES (?, ?, ?, ?, ?)'
    ).bind(ideaId, file.name, fileUrl, file.size, 'file').run();

    const attachmentId = result.meta.last_row_id;
    const attachment = await c.env.DB.prepare(
      'SELECT * FROM attachments WHERE id = ?'
    ).bind(attachmentId).first<Attachment>();

    return c.json({
      message: 'File uploaded successfully',
      attachment
    }, 201);
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ error: 'Failed to upload file' }, 500);
  }
});

attachments.get('/file/:fileName', async (c) => {
  const fileName = c.req.param('fileName');

  try {
    const object = await c.env.BUCKET.get(fileName);

    if (!object) {
      return c.json({ error: 'File not found' }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000');

    return new Response(object.body, {
      headers,
    });
  } catch (error) {
    console.error('Get file error:', error);
    return c.json({ error: 'Failed to get file' }, 500);
  }
});

attachments.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const attachmentId = c.req.param('id');

  try {
    const attachment = await c.env.DB.prepare(
      'SELECT a.*, i.user_id FROM attachments a JOIN ideas i ON a.idea_id = i.id WHERE a.id = ?'
    ).bind(attachmentId).first<Attachment & { user_id: number }>();

    if (!attachment) {
      return c.json({ error: 'Attachment not found' }, 404);
    }

    if (attachment.user_id !== userId) {
      return c.json({ error: 'Access denied' }, 403);
    }

    const fileKey = attachment.file_url.split('/').pop();
    if (fileKey) {
      await c.env.BUCKET.delete(fileKey);
    }

    await c.env.DB.prepare('DELETE FROM attachments WHERE id = ?').bind(attachmentId).run();

    return c.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Delete attachment error:', error);
    return c.json({ error: 'Failed to delete attachment' }, 500);
  }
});

export default attachments;
