import { neon } from '@neondatabase/serverless';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const sql = neon(process.env.DATABASE_URL);

// Map legacy peers.status -> new peers.state.
//   'inactive' -> 'archived'
//   anything else (including NULL or 'active') -> 'active'
async function run() {
  // Active = legacy status NULL or anything not 'inactive'
  const activeRes = await sql.query(
    `UPDATE peers
       SET state = 'active',
           state_changed_at = COALESCE(updated_at, now()),
           state_changed_by = 'backfill_migration',
           state_change_reason = 'Phase 1.3 backfill'
     WHERE (status IS NULL OR status <> 'inactive')
       AND state <> 'active'
     RETURNING id`
  );
  console.log('updated to active:', activeRes.length);

  const archivedRes = await sql.query(
    `UPDATE peers
       SET state = 'archived',
           state_changed_at = COALESCE(updated_at, now()),
           state_changed_by = 'backfill_migration',
           state_change_reason = 'Phase 1.3 backfill'
     WHERE status = 'inactive'
       AND state <> 'archived'
     RETURNING id`
  );
  console.log('updated to archived:', archivedRes.length);

  const dist = await sql.query(
    `SELECT state, count(*)::int AS c FROM peers GROUP BY state ORDER BY state`
  );
  console.log('distribution:', dist);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
