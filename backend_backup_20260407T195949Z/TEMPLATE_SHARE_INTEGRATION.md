# Template share (in-app messaging)

## If the app shows “404” or “Template sharing is not enabled”

The mobile app calls **`GET /api/template-share/conversations`**. A **404** means your running Node server does **not** mount these routes yet (or the process wasn’t restarted after adding them).

**Fix on the server (e.g. `64.227.150.214`):**

1. Copy `routes/templateShareRoutes.js` (and keep `db/template_share_schema.sql`).
2. In **`server.js`** (same folder as your other `app.use('/api/...')` lines), **after** `pool` exists:

   ```javascript
   const templateShareRoutes = require('./routes/templateShareRoutes');
   app.use('/api/template-share', templateShareRoutes(pool));
   ```

3. Run the SQL migration (once): `psql ... -f db/template_share_schema.sql`
4. Restart: `pm2 restart all` or however you run `node server.js`.

Quick check: `curl -sS "http://YOUR_HOST:3000/api/template-share/conversations?user_id=1"` should return **JSON** (`success` / `data` or a JSON error), not HTML.

---

## 1. Database

Apply the migration (PostgreSQL):

```bash
psql "$DATABASE_URL" -f db/template_share_schema.sql
```

Requires existing tables **`profiles`** (`id`, `phone_number`, `first_name`, `last_name`, `profile_photo_url`) and **`templates`** (`id`, `name`, `file_url`). If your column names differ, adjust `routes/templateShareRoutes.js`.

## 2. Mount routes in Express

After you create `pool` (same `pg.Pool` as the rest of the API):

```javascript
const templateShareRoutes = require('./routes/templateShareRoutes');
app.use('/api/template-share', templateShareRoutes(pool));
```

All endpoints are under `/api/template-share`:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/conversations?user_id=` | List conversations for user |
| POST | `/conversations/open` | Body: `{ user_id, other_user_id }` or `{ user_id, other_phone }` |
| GET | `/conversations/:id/messages?user_id=` | Message history |
| POST | `/conversations/:id/messages` | Body: `{ user_id, template_id }` |
| POST | `/contacts/match` | Body: `{ user_id, phones: string[] }` — returns registered users whose `users.phone_number` matches any normalized number (full digits or last 10). Max 250 numbers. Excludes the requester. |

## 3. Mobile app

The Expo app calls these via `api.*` in `lib/api.ts`. After deploying the backend and running the SQL migration, the **Share** tab on Home shows the inbox.
