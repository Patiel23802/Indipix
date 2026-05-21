/**
 * Template sharing: 1:1 conversations where each message references a catalog template only.
 * Mount: app.use('/api/template-share', templateShareRoutes(pool));
 */

const express = require('express');

function orderUserPair(a, b) {
  const s1 = String(a);
  const s2 = String(b);
  if (s1 === s2) return null;
  return s1 < s2 ? [s1, s2] : [s2, s1];
}

function normalizePhoneDigits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

module.exports = function templateShareRoutes(pool) {
  const router = express.Router();
  router.use(express.json());

  async function findUserByPhone(rawPhone) {
    const digits = normalizePhoneDigits(rawPhone);
    if (!digits) return null;
    const variants = [...new Set([rawPhone, digits].filter(Boolean))];
    if (digits.length >= 10) {
      variants.push(digits.slice(-10));
      variants.push(`+91${digits.slice(-10)}`);
    }
    const res = await pool.query(
      `SELECT id::text AS id,
              first_name,
              last_name,
              profile_photo_url,
              phone_number
         FROM profiles
        WHERE phone_number = ANY($1::text[])
           OR REGEXP_REPLACE(COALESCE(phone_number, ''), '[^0-9]', '', 'g') = $2
           OR RIGHT(REGEXP_REPLACE(COALESCE(phone_number, ''), '[^0-9]', '', 'g'), 10) = $3
        LIMIT 1`,
      [variants, digits, digits.slice(-10)]
    );
    return res.rows[0] || null;
  }

  async function getUserById(userId) {
    const res = await pool.query(
      `SELECT id::text AS id, first_name, last_name, profile_photo_url, phone_number
         FROM profiles WHERE id::text = $1 LIMIT 1`,
      [String(userId)]
    );
    return res.rows[0] || null;
  }

  async function assertParticipant(conversationId, userId) {
    const res = await pool.query(
      `SELECT id, user_low, user_high FROM template_share_conversations
        WHERE id = $1::uuid AND (user_low = $2 OR user_high = $2)`,
      [conversationId, String(userId)]
    );
    return res.rows[0] || null;
  }

  /** GET /conversations?user_id= */
  router.get('/conversations', async (req, res) => {
    try {
      const userId = String(req.query.user_id || '');
      if (!userId) {
        return res.status(400).json({ success: false, error: 'user_id required' });
      }
      const q = `
        WITH conv AS (
          SELECT c.id, c.user_low, c.user_high, c.updated_at
            FROM template_share_conversations c
           WHERE c.user_low = $1 OR c.user_high = $1
        ),
        last_m AS (
          SELECT DISTINCT ON (m.conversation_id)
                 m.conversation_id, m.sender_id, m.template_id, m.created_at
            FROM template_share_messages m
           WHERE m.conversation_id IN (SELECT id FROM conv)
           ORDER BY m.conversation_id, m.created_at DESC
        )
        SELECT conv.id AS conversation_id,
               conv.user_low,
               conv.user_high,
               conv.updated_at,
               last_m.sender_id AS last_sender_id,
               last_m.template_id AS last_template_id,
               last_m.created_at AS last_message_at,
               tpl.name AS last_template_name,
               tpl.file_url AS last_template_file_url
          FROM conv
          LEFT JOIN last_m ON last_m.conversation_id = conv.id
          LEFT JOIN templates tpl ON tpl.id::text = last_m.template_id
         ORDER BY conv.updated_at DESC NULLS LAST
      `;
      const { rows } = await pool.query(q, [userId]);
      const data = rows.map((row) => {
        const otherId = row.user_low === userId ? row.user_high : row.user_low;
        return {
          conversation_id: row.conversation_id,
          other_user_id: otherId,
          updated_at: row.updated_at,
          last_message: row.last_template_id
            ? {
                template_id: row.last_template_id,
                template_name: row.last_template_name,
                file_url: row.last_template_file_url,
                sender_id: row.last_sender_id,
                created_at: row.last_message_at,
              }
            : null,
        };
      });
      for (let i = 0; i < data.length; i++) {
        const ou = await getUserById(data[i].other_user_id);
        data[i].other_user = ou
          ? {
              id: ou.id,
              first_name: ou.first_name,
              last_name: ou.last_name,
              profile_photo_url: ou.profile_photo_url,
            }
          : { id: data[i].other_user_id, first_name: null, last_name: null, profile_photo_url: null };
      }
      return res.json({ success: true, data });
    } catch (e) {
      console.error('template-share conversations', e);
      return res.status(500).json({ success: false, error: e.message || 'Server error' });
    }
  });

  /**
   * POST /contacts/match { user_id, phones: string[] }
   * Normalizes device phone strings and returns ChitraKala accounts (excluding self).
   * Max 250 numbers per request.
   */
  router.post('/contacts/match', async (req, res) => {
    try {
      const userId = String(req.body.user_id || req.body.userId || '');
      const phones = req.body.phones;
      if (!userId) {
        return res.status(400).json({ success: false, error: 'user_id required' });
      }
      if (!Array.isArray(phones)) {
        return res.status(400).json({ success: false, error: 'phones must be an array' });
      }
      const normalized = phones
        .map((p) => normalizePhoneDigits(p))
        .filter((d) => d.length >= 8 && d.length <= 16);
      const uniqueFull = [...new Set(normalized)].slice(0, 250);
      const uniqueLast10 = [...new Set(uniqueFull.map((d) => d.slice(-10)))].filter((x) => x.length === 10);

      if (uniqueFull.length === 0) {
        return res.json({ success: true, data: { matches: [] } });
      }

      const { rows } = await pool.query(
        `SELECT u.id::text AS id,
                u.first_name,
                u.last_name,
                u.profile_photo_url,
                REGEXP_REPLACE(COALESCE(u.phone_number, ''), '[^0-9]', '', 'g') AS norm
           FROM profiles u
          WHERE u.id::text <> $1
            AND LENGTH(REGEXP_REPLACE(COALESCE(u.phone_number, ''), '[^0-9]', '', 'g')) >= 8
            AND (
              REGEXP_REPLACE(COALESCE(u.phone_number, ''), '[^0-9]', '', 'g') = ANY($2::text[])
              OR RIGHT(REGEXP_REPLACE(COALESCE(u.phone_number, ''), '[^0-9]', '', 'g'), 10) = ANY($3::text[])
            )`,
        [userId, uniqueFull, uniqueLast10.length > 0 ? uniqueLast10 : uniqueFull.map((d) => d.slice(-10))]
      );

      const seen = new Set();
      const matches = [];
      for (const r of rows) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        const norm = r.norm || '';
        matches.push({
          user: {
            id: r.id,
            first_name: r.first_name,
            last_name: r.last_name,
            profile_photo_url: r.profile_photo_url,
          },
          phone_last10: norm.length >= 10 ? norm.slice(-10) : norm,
          phone_full_norm: norm,
        });
      }

      return res.json({ success: true, data: { matches } });
    } catch (e) {
      console.error('template-share contacts/match', e);
      return res.status(500).json({ success: false, error: e.message || 'Server error' });
    }
  });

  /** POST /conversations/open { user_id, other_user_id? | other_phone? } */
  router.post('/conversations/open', async (req, res) => {
    try {
      const userId = String(req.body.user_id || req.body.userId || '');
      let otherId = String(req.body.other_user_id || req.body.otherUserId || '');
      const otherPhone = req.body.other_phone || req.body.otherPhone;

      if (!userId) {
        return res.status(400).json({ success: false, error: 'user_id required' });
      }

      if (!otherId && otherPhone) {
        const found = await findUserByPhone(otherPhone);
        if (!found) {
          return res.status(404).json({ success: false, error: 'No user found for that phone number' });
        }
        otherId = found.id;
      }

      if (!otherId) {
        return res.status(400).json({ success: false, error: 'other_user_id or other_phone required' });
      }
      if (otherId === userId) {
        return res.status(400).json({ success: false, error: 'Cannot start a chat with yourself' });
      }

      const pair = orderUserPair(userId, otherId);
      if (!pair) {
        return res.status(400).json({ success: false, error: 'Invalid user pair' });
      }
      const [user_low, user_high] = pair;

      const ins = await pool.query(
        `INSERT INTO template_share_conversations (user_low, user_high)
         VALUES ($1, $2)
         ON CONFLICT (user_low, user_high) DO NOTHING
         RETURNING id`,
        [user_low, user_high]
      );
      let convId = ins.rows[0]?.id;
      if (!convId) {
        const sel = await pool.query(
          `SELECT id FROM template_share_conversations WHERE user_low = $1 AND user_high = $2`,
          [user_low, user_high]
        );
        convId = sel.rows[0]?.id;
      }
      const otherUser = await getUserById(otherId);
      return res.json({
        success: true,
        data: {
          conversation_id: convId,
          other_user: otherUser
            ? {
                id: otherUser.id,
                first_name: otherUser.first_name,
                last_name: otherUser.last_name,
                profile_photo_url: otherUser.profile_photo_url,
              }
            : { id: otherId },
        },
      });
    } catch (e) {
      console.error('template-share open', e);
      return res.status(500).json({ success: false, error: e.message || 'Server error' });
    }
  });

  /** GET /conversations/:id/messages?user_id=&limit= */
  router.get('/conversations/:id/messages', async (req, res) => {
    try {
      const conversationId = req.params.id;
      const userId = String(req.query.user_id || '');
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));
      if (!userId) {
        return res.status(400).json({ success: false, error: 'user_id required' });
      }
      const conv = await assertParticipant(conversationId, userId);
      if (!conv) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }
      const { rows } = await pool.query(
        `SELECT m.id::text AS id,
                m.sender_id::text AS sender_id,
                m.template_id::text AS template_id,
                m.created_at,
                tpl.name AS template_name,
                tpl.file_url AS file_url
           FROM template_share_messages m
           LEFT JOIN templates tpl ON tpl.id::text = m.template_id
          WHERE m.conversation_id = $1::uuid
          ORDER BY m.created_at DESC
          LIMIT $2`,
        [conversationId, limit]
      );
      return res.json({ success: true, data: rows.reverse() });
    } catch (e) {
      console.error('template-share messages', e);
      return res.status(500).json({ success: false, error: e.message || 'Server error' });
    }
  });

  /** POST /conversations/:id/messages { user_id, template_id } */
  router.post('/conversations/:id/messages', async (req, res) => {
    try {
      const conversationId = req.params.id;
      const userId = String(req.body.user_id || req.body.userId || '');
      const templateId = String(req.body.template_id || req.body.templateId || '');
      if (!userId || !templateId) {
        return res.status(400).json({ success: false, error: 'user_id and template_id required' });
      }
      const conv = await assertParticipant(conversationId, userId);
      if (!conv) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }
      const tpl = await pool.query(`SELECT id::text FROM templates WHERE id::text = $1 LIMIT 1`, [templateId]);
      if (tpl.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'Invalid template' });
      }
      const ins = await pool.query(
        `INSERT INTO template_share_messages (conversation_id, sender_id, template_id)
         VALUES ($1::uuid, $2, $3)
         RETURNING id::text AS id, sender_id::text AS sender_id, template_id::text AS template_id, created_at`,
        [conversationId, userId, templateId]
      );
      await pool.query(`UPDATE template_share_conversations SET updated_at = now() WHERE id = $1::uuid`, [
        conversationId,
      ]);
      const row = ins.rows[0];
      const meta = await pool.query(`SELECT name, file_url FROM templates WHERE id::text = $1`, [templateId]);
      return res.json({
        success: true,
        data: {
          ...row,
          template_name: meta.rows[0]?.name,
          file_url: meta.rows[0]?.file_url,
        },
      });
    } catch (e) {
      console.error('template-share send', e);
      return res.status(500).json({ success: false, error: e.message || 'Server error' });
    }
  });

  return router;
};
