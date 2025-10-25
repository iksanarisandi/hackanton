import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './types';
import { authMiddleware } from './utils/auth';
import auth from './routes/auth';
import ideas from './routes/ideas';
import attachments from './routes/attachments';
import stats from './routes/stats';
import { serveStatic } from 'hono/cloudflare-workers';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
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
