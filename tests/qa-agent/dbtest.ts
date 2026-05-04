import { sql } from './db-helpers';
(async () => {
  const r = await sql('SELECT current_database() as db, now()::text as now');
  console.log(JSON.stringify(r));
})();
