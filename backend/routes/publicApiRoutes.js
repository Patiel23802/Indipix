/**
 * Mobile app public API: categories, carousel, templates + likes/downloads, notifications, push tokens.
 * Expects DB schema: templates (uuid id, category_id), categories (slug), template_likes, template_downloads, etc.
 */

const express = require('express');

module.exports = function publicApiRoutes(pool) {
  const router = express.Router();
  router.use(express.json());

  router.get('/categories', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, name, slug, description, icon, color, sort_order
           FROM categories
          WHERE is_active = true
          ORDER BY sort_order ASC NULLS LAST, name ASC`
      );
      res.json({ success: true, data: rows });
    } catch (e) {
      console.error('public /categories', e);
      res.status(500).json({ success: false, error: e.message || 'Server error' });
    }
  });

  router.get('/home-carousel-slides', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, image_url, sort_order
           FROM home_carousel_slides
          WHERE is_active = true
          ORDER BY sort_order ASC, created_at ASC
          LIMIT 10`
      );
      res.json({ success: true, data: rows });
    } catch (e) {
      console.error('public /home-carousel-slides', e);
      res.status(500).json({ success: false, error: e.message || 'Server error' });
    }
  });

  /** GET /templates — query: category (slug), search, user_id, limit, offset, sort=trending */
  router.get('/templates', async (req, res) => {
    try {
      const categorySlug = req.query.category ? String(req.query.category) : null;
      const search = req.query.search ? String(req.query.search).trim() : null;
      const userId = req.query.user_id ? String(req.query.user_id) : null;
      const sortTrending = req.query.sort === 'trending';
      const limit = Math.min(Math.max(parseInt(String(req.query.limit || '80'), 10) || 80, 1), 200);
      const offset = Math.max(parseInt(String(req.query.offset || '0'), 10) || 0, 0);

      const params = [];
      let p = 1;
      let where = `t.status = 'active' AND c.is_active = true`;

      if (categorySlug) {
        where += ` AND c.slug = $${p++}`;
        params.push(categorySlug);
      }
      if (search) {
        where += ` AND (t.name ILIKE $${p} OR COALESCE(t.description,'') ILIKE $${p})`;
        params.push(`%${search}%`);
        p++;
      }

      const userParamIdx = userId ? p++ : null;
      if (userId) params.push(userId);

      const likeCountSql = `(SELECT COUNT(*)::int FROM template_likes tl WHERE tl.template_id = t.id::text)`;
      const likedSql =
        userId != null
          ? `EXISTS (SELECT 1 FROM template_likes tl2 WHERE tl2.template_id = t.id::text AND tl2.user_id = $${userParamIdx}::uuid)`
          : `false`;

      const orderSql = sortTrending
        ? `${likeCountSql} DESC NULLS LAST, t.created_at DESC NULLS LAST`
        : `t.created_at DESC NULLS LAST`;

      const sql = `
        SELECT
          t.id,
          t.name,
          t.slug,
          c.slug AS category_slug,
          c.name AS category_name,
          c.icon AS category_icon,
          c.color AS category_color,
          t.description,
          t.file_url,
          t.file_name,
          t.file_format,
          t.file_size,
          t.aspect_ratio,
          t.status,
          t.download_count,
          t.created_at,
          ${likeCountSql} AS like_count,
          (${likedSql}) AS liked
        FROM templates t
        INNER JOIN categories c ON c.id = t.category_id
        WHERE ${where}
        ORDER BY ${orderSql}
        LIMIT ${limit} OFFSET ${offset}
      `;

      const { rows } = await pool.query(sql, params);
      res.json({ success: true, data: rows });
    } catch (e) {
      console.error('public GET /templates', e);
      res.status(500).json({ success: false, error: e.message || 'Server error' });
    }
  });

  router.get('/templates/liked', async (req, res) => {
    try {
      const userId = req.query.user_id ? String(req.query.user_id) : '';
      if (!userId) {
        return res.status(400).json({ success: false, error: 'user_id required' });
      }

      const sql = `
        SELECT
          t.id,
          t.name,
          t.slug,
          c.slug AS category_slug,
          c.name AS category_name,
          c.icon AS category_icon,
          c.color AS category_color,
          t.description,
          t.file_url,
          t.file_name,
          t.file_format,
          t.file_size,
          t.aspect_ratio,
          t.status,
          t.download_count,
          t.created_at,
          (SELECT COUNT(*)::int FROM template_likes tl WHERE tl.template_id = t.id::text) AS like_count,
          true AS liked
        FROM template_likes tl
        INNER JOIN templates t ON t.id::text = tl.template_id
        INNER JOIN categories c ON c.id = t.category_id
        WHERE tl.user_id = $1::uuid
          AND t.status = 'active'
          AND c.is_active = true
        ORDER BY tl.created_at DESC
      `;
      const { rows } = await pool.query(sql, [userId]);
      res.json({ success: true, data: rows });
    } catch (e) {
      console.error('public GET /templates/liked', e);
      res.status(500).json({ success: false, error: e.message || 'Server error' });
    }
  });

  async function likeCountForTemplate(templateIdText) {
    const r = await pool.query(
      `SELECT COUNT(*)::int AS c FROM template_likes WHERE template_id = $1`,
      [templateIdText]
    );
    return r.rows[0]?.c ?? 0;
  }

  router.post('/templates/:id/like', async (req, res) => {
    try {
      const templateId = String(req.params.id || '');
      const userId = String(req.body.userId || req.body.user_id || '');
      if (!userId || !templateId) {
        return res.status(400).json({ success: false, error: 'userId and template id required' });
      }

      const tpl = await pool.query(`SELECT id FROM templates WHERE id::text = $1 AND status = 'active'`, [
        templateId,
      ]);
      if (tpl.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Template not found' });
      }

      await pool.query(
        `INSERT INTO template_likes (user_id, template_id) VALUES ($1::uuid, $2)
         ON CONFLICT (user_id, template_id) DO NOTHING`,
        [userId, templateId]
      );

      const like_count = await likeCountForTemplate(templateId);
      res.json({ success: true, liked: true, like_count });
    } catch (e) {
      console.error('public POST /templates/:id/like', e);
      res.status(500).json({ success: false, error: e.message || 'Server error' });
    }
  });

  router.delete('/templates/:id/like', async (req, res) => {
    try {
      const templateId = String(req.params.id || '');
      const userId = String(req.body.userId || req.body.user_id || '');
      if (!userId || !templateId) {
        return res.status(400).json({ success: false, error: 'userId and template id required' });
      }

      await pool.query(`DELETE FROM template_likes WHERE user_id = $1::uuid AND template_id = $2`, [
        userId,
        templateId,
      ]);

      const like_count = await likeCountForTemplate(templateId);
      res.json({ success: true, liked: false, like_count });
    } catch (e) {
      console.error('public DELETE /templates/:id/like', e);
      res.status(500).json({ success: false, error: e.message || 'Server error' });
    }
  });

  router.post('/templates/:id/download', async (req, res) => {
    try {
      const templateId = String(req.params.id || '');
      const userIdRaw = req.body.userId;
      const userId =
        userIdRaw === undefined || userIdRaw === null || userIdRaw === ''
          ? null
          : String(userIdRaw);

      const tpl = await pool.query(
        `SELECT id FROM templates WHERE id::text = $1 AND status = 'active'`,
        [templateId]
      );
      if (tpl.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Template not found' });
      }

      await pool.query(
        `UPDATE templates SET download_count = COALESCE(download_count, 0) + 1 WHERE id::text = $1`,
        [templateId]
      );

      if (userId) {
        await pool.query(
          `INSERT INTO template_downloads (user_id, template_id) VALUES ($1::uuid, $2)`,
          [userId, templateId]
        );
      }

      res.json({ success: true });
    } catch (e) {
      console.error('public POST /templates/:id/download', e);
      res.status(500).json({ success: false, error: e.message || 'Server error' });
    }
  });

  router.get('/notifications/unread-count', async (req, res) => {
    try {
      const userId = req.query.user_id ? String(req.query.user_id) : '';
      if (!userId) {
        return res.status(400).json({ success: false, error: 'user_id required' });
      }
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS n
           FROM notifications
          WHERE user_id = $1::uuid AND COALESCE(is_read, false) = false`,
        [userId]
      );
      res.json({ success: true, count: rows[0]?.n ?? 0 });
    } catch (e) {
      console.error('public GET /notifications/unread-count', e);
      res.status(500).json({ success: false, error: e.message || 'Server error' });
    }
  });

  /** Unread only — mark read or read-all removes them from this list */
  router.get('/notifications', async (req, res) => {
    try {
      const userId = req.query.user_id ? String(req.query.user_id) : '';
      if (!userId) {
        return res.status(400).json({ success: false, error: 'user_id required' });
      }
      const { rows } = await pool.query(
        `SELECT id, user_id, type, title, message, data, is_read, read_at, created_at
           FROM notifications
          WHERE user_id = $1::uuid AND COALESCE(is_read, false) = false
          ORDER BY created_at DESC
          LIMIT 100`,
        [userId]
      );
      res.json({ success: true, data: rows });
    } catch (e) {
      console.error('public GET /notifications', e);
      res.status(500).json({ success: false, error: e.message || 'Server error' });
    }
  });

  router.post('/notifications/read-all', async (req, res) => {
    try {
      const userId = String(req.body.userId || req.body.user_id || '').trim();
      if (!userId) {
        return res.status(400).json({ success: false, error: 'userId required' });
      }
      const r = await pool.query(
        `UPDATE notifications
            SET is_read = true, read_at = NOW()
          WHERE user_id = $1::uuid AND COALESCE(is_read, false) = false`,
        [userId]
      );
      res.json({ success: true, updated: r.rowCount ?? 0 });
    } catch (e) {
      console.error('public POST /notifications/read-all', e);
      res.status(500).json({ success: false, error: e.message || 'Server error' });
    }
  });

  router.patch('/notifications/:id/read', async (req, res) => {
    try {
      const id = String(req.params.id || '').trim();
      const userId = String(req.body.userId || req.body.user_id || '').trim();
      if (!id || !userId) {
        return res.status(400).json({ success: false, error: 'notification id and userId required' });
      }
      const r = await pool.query(
        `UPDATE notifications
            SET is_read = true, read_at = NOW()
          WHERE id = $1::bigint AND user_id = $2::uuid AND COALESCE(is_read, false) = false
          RETURNING id`,
        [id, userId]
      );
      if (r.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Notification not found or already read' });
      }
      res.json({ success: true });
    } catch (e) {
      console.error('public PATCH /notifications/:id/read', e);
      res.status(500).json({ success: false, error: e.message || 'Server error' });
    }
  });

  router.post('/push/register-token', async (req, res) => {
    try {
      const userId = String(req.body.userId || req.body.user_id || '');
      const token = String(req.body.token || '');
      if (!userId || !token) {
        return res.status(400).json({ success: false, error: 'userId and token required' });
      }
      const platform = req.body.platform ? String(req.body.platform).slice(0, 16) : null;
      const appVersion = req.body.appVersion ? String(req.body.appVersion).slice(0, 32) : null;

      await pool.query(
        `INSERT INTO device_tokens (user_id, token, platform, app_version, is_active, last_seen_at, updated_at)
         VALUES ($1::uuid, $2, $3, $4, true, now(), now())
         ON CONFLICT (token) DO UPDATE SET
           user_id = EXCLUDED.user_id,
           platform = EXCLUDED.platform,
           app_version = EXCLUDED.app_version,
           is_active = true,
           last_seen_at = now(),
           updated_at = now()`,
        [userId, token, platform, appVersion]
      );
      res.json({ success: true });
    } catch (e) {
      console.error('public POST /push/register-token', e);
      res.status(500).json({ success: false, error: e.message || 'Server error' });
    }
  });

  router.post('/push/unregister-token', async (req, res) => {
    try {
      const token = String(req.body.token || '');
      if (!token) {
        return res.status(400).json({ success: false, error: 'token required' });
      }
      await pool.query(
        `UPDATE device_tokens SET is_active = false, updated_at = now() WHERE token = $1`,
        [token]
      );
      res.json({ success: true });
    } catch (e) {
      console.error('public POST /push/unregister-token', e);
      res.status(500).json({ success: false, error: e.message || 'Server error' });
    }
  });

  // --- Locations (profile edit: State / District / Tahsil) ---
  router.get('/locations/states', async (_req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, name, state_code
           FROM states
          ORDER BY name ASC`
      );
      res.json({ success: true, data: rows });
    } catch (e) {
      console.error('public GET /locations/states', e);
      res.status(500).json({ success: false, error: e.message || 'Server error' });
    }
  });

  router.get('/locations/districts', async (req, res) => {
    try {
      const stateId = parseInt(String(req.query.state_id || ''), 10);
      if (!Number.isFinite(stateId)) {
        return res.status(400).json({ success: false, error: 'state_id required' });
      }
      const { rows } = await pool.query(
        `SELECT id, state_id, name, district_code
           FROM districts
          WHERE state_id = $1
          ORDER BY name ASC`,
        [stateId]
      );
      res.json({ success: true, data: rows });
    } catch (e) {
      console.error('public GET /locations/districts', e);
      res.status(500).json({ success: false, error: e.message || 'Server error' });
    }
  });

  router.get('/locations/tehsils', async (req, res) => {
    try {
      const districtId = parseInt(String(req.query.district_id || ''), 10);
      if (!Number.isFinite(districtId)) {
        return res.status(400).json({ success: false, error: 'district_id required' });
      }
      const { rows } = await pool.query(
        `SELECT id, district_id, name
           FROM tehsils
          WHERE district_id = $1
          ORDER BY name ASC`,
        [districtId]
      );
      res.json({ success: true, data: rows });
    } catch (e) {
      console.error('public GET /locations/tehsils', e);
      res.status(500).json({ success: false, error: e.message || 'Server error' });
    }
  });

  // --- Political parties (national + state-scoped via political_party_states) ---
  router.get('/political-parties/lookup', async (req, res) => {
    try {
      const name = String(req.query.name || '').trim();
      if (!name) {
        return res.status(400).json({ success: false, error: 'name required' });
      }
      const { rows } = await pool.query(
        `SELECT id, name, short_name, logo_url, color
           FROM political_parties
          WHERE COALESCE(is_active, true)
            AND name ILIKE $1
          ORDER BY LENGTH(name) ASC
          LIMIT 1`,
        [name]
      );
      if (rows.length === 0) {
        return res.json({ success: true, data: null });
      }
      res.json({ success: true, data: rows[0] });
    } catch (e) {
      console.error('public GET /political-parties/lookup', e);
      res.status(500).json({ success: false, error: e.message || 'Server error' });
    }
  });

  /** POST /suggestions — app users send feedback (userId + message; optional subject) */
  router.post('/suggestions', async (req, res) => {
    try {
      const userId = String(req.body.userId || req.body.user_id || '').trim();
      const bodyText = req.body.message != null ? String(req.body.message).trim() : '';
      const subjectRaw = req.body.subject != null ? String(req.body.subject).trim() : '';
      const subject = subjectRaw ? subjectRaw.slice(0, 255) : null;
      if (!userId || !bodyText) {
        return res.status(400).json({ success: false, error: 'userId and message are required' });
      }
      if (bodyText.length > 8000) {
        return res.status(400).json({ success: false, error: 'Message is too long (max 8000 characters)' });
      }
      const exists = await pool.query(`SELECT 1 FROM profiles WHERE id::text = $1 OR id = $1::uuid`, [userId]);
      if (exists.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      await pool.query(
        `INSERT INTO user_suggestions (user_id, subject, body) VALUES ($1::uuid, $2, $3)`,
        [userId, subject, bodyText]
      );
      res.json({ success: true });
    } catch (e) {
      console.error('public POST /suggestions', e);
      res.status(500).json({ success: false, error: e.message || 'Server error' });
    }
  });

  router.get('/political-parties', async (req, res) => {
    try {
      const stateId = parseInt(String(req.query.state_id || ''), 10);
      if (!Number.isFinite(stateId)) {
        return res.status(400).json({ success: false, error: 'state_id required' });
      }
      const { rows } = await pool.query(
        `SELECT p.id, p.name, p.short_name, p.logo_url, p.color
           FROM political_parties p
          WHERE COALESCE(p.is_active, true)
            AND (
              COALESCE(p.is_national, false) = true
              OR EXISTS (
                SELECT 1 FROM political_party_states pps
                 WHERE pps.party_id = p.id AND pps.state_id = $1
              )
            )
          ORDER BY p.sort_order NULLS LAST, p.name ASC`,
        [stateId]
      );
      res.json({ success: true, data: rows });
    } catch (e) {
      console.error('public GET /political-parties', e);
      res.status(500).json({ success: false, error: e.message || 'Server error' });
    }
  });

  return router;
};
