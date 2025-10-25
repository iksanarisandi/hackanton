import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { Env } from './types';
import { authMiddleware } from './utils/auth';
import auth from './routes/auth';
import ideas from './routes/ideas';
import attachments from './routes/attachments';
import stats from './routes/stats';
import { serveStatic } from 'hono/cloudflare-workers';

const app = new Hono<{ Bindings: Env }>();

// Security headers
app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "https:", "blob:"],
    connectSrc: ["'self'"],
    mediaSrc: ["'self'", "https:", "blob:"],
  },
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
}));

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

app.route('/api/auth', auth);

app.use('/api/ideas/*', authMiddleware);
app.route('/api/ideas', ideas);

app.use('/api/attachments/*', authMiddleware);
app.route('/api/attachments', attachments);

app.use('/api/stats/*', authMiddleware);
app.route('/api/stats', stats);

app.get('/api/auth/me', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const userEmail = c.get('userEmail');
  return c.json({ user: { id: userId, email: userEmail } });
});

// Serve R2 files with custom domain
app.get('/files/:fileName', async (c) => {
  const fileName = c.req.param('fileName');

  try {
    const object = await c.env.BUCKET.get(fileName);

    if (!object) {
      return c.notFound();
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000');

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('Get file error:', error);
    return c.notFound();
  }
});

// Serve static files from public folder
app.get('/', serveStatic({ path: './index.html' }));
app.get('/script.js', serveStatic({ path: './script.js' }));
app.get('/favicon.ico', serveStatic({ path: './favicon.ico' }));

app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
