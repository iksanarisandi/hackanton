import { Hono } from 'hono';
import { Env } from '../types';

const stats = new Hono<{ Bindings: Env }>();

stats.get('/', async (c) => {
  const userId = c.get('userId');

  try {
    const statusStats = await c.env.DB.prepare(`
      SELECT 
        status,
        COUNT(*) as count
      FROM ideas 
      WHERE user_id = ?
      GROUP BY status
    `).bind(userId).all<{ status: string; count: number }>();

    const monthlyStats = await c.env.DB.prepare(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as count
      FROM ideas 
      WHERE user_id = ?
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `).bind(userId).all<{ month: string; count: number }>();

    const totalAttachments = await c.env.DB.prepare(`
      SELECT COUNT(*) as total
      FROM attachments a
      JOIN ideas i ON a.idea_id = i.id
      WHERE i.user_id = ?
    `).bind(userId).first<{ total: number }>();

    const totalIdeas = await c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM ideas WHERE user_id = ?'
    ).bind(userId).first<{ total: number }>();

    const totalStorage = await c.env.DB.prepare(`
      SELECT COALESCE(SUM(a.size), 0) as total
      FROM attachments a
      JOIN ideas i ON a.idea_id = i.id
      WHERE i.user_id = ?
    `).bind(userId).first<{ total: number }>();

    return c.json({
      statusStats: statusStats.results,
      monthlyStats: monthlyStats.results,
      totalAttachments: totalAttachments?.total || 0,
      totalIdeas: totalIdeas?.total || 0,
      totalStorage: totalStorage?.total || 0
    });
  } catch (error) {
    console.error('Stats error:', error);
    return c.json({ error: 'Failed to fetch statistics' }, 500);
  }
});

export default stats;
