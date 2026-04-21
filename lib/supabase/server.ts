import { neon, NeonQueryFunction } from '@neondatabase/serverless';

// Re-export the Drizzle ORM database instance for new code
export { db } from '@/lib/db';

// Cache the neon SQL function per request
let _sql: NeonQueryFunction<false, false> | null = null;
function getDb(): NeonQueryFunction<false, false> {
  if (!_sql) {
    _sql = neon(process.env.DATABASE_URL!);
  }
  return _sql;
}

// Helper: execute a parameterized SQL query via neon's tagged template
// We convert string + params into a tagged template call
async function execSql(sqlStr: string, params: unknown[] = []): Promise<any[]> {
  const sql = getDb();
  if (params.length === 0) {
    // No params — use tagged template directly with raw SQL
    const strings = [sqlStr] as unknown as TemplateStringsArray;
    Object.defineProperty(strings, 'raw', { value: [sqlStr] });
    return await (sql as any)(strings);
  }
  // With params — split the SQL on $1, $2, etc. to create template parts
  const parts: string[] = [];
  let lastIndex = 0;
  for (let i = 1; i <= params.length; i++) {
    const placeholder = `$${i}`;
    const idx = sqlStr.indexOf(placeholder, lastIndex);
    if (idx === -1) break;
    parts.push(sqlStr.slice(lastIndex, idx));
    lastIndex = idx + placeholder.length;
  }
  parts.push(sqlStr.slice(lastIndex));

  const strings = parts as unknown as TemplateStringsArray;
  Object.defineProperty(strings, 'raw', { value: parts });
  return await (sql as any)(strings, ...params);
}

// Helper to run queries - returns rows
export async function query<T = Record<string, unknown>>(
  sqlStr: string,
  params: unknown[] = []
): Promise<T[]> {
  return await execSql(sqlStr, params) as T[];
}

// Helper to run a query and return first row
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] || null;
}

// Helper to run an insert and return the inserted row
export async function insert<T = Record<string, unknown>>(
  table: string,
  data: Record<string, unknown>
): Promise<T> {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const columns = keys.join(', ');

  const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`;
  const rows = await query<T>(sql, values);
  return rows[0];
}

// Helper to run an update
export async function update<T = Record<string, unknown>>(
  table: string,
  data: Record<string, unknown>,
  where: string,
  whereParams: unknown[] = []
): Promise<T | null> {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const paramOffset = keys.length;

  // Rewrite where clause placeholders
  const adjustedWhere = where.replace(/\$(\d+)/g, (_, n) => `$${parseInt(n) + paramOffset}`);

  const sql = `UPDATE ${table} SET ${setClause} WHERE ${adjustedWhere} RETURNING *`;
  const rows = await query<T>(sql, [...values, ...whereParams]);
  return rows[0] || null;
}

// Signed URL placeholder for charts (no Supabase storage)
export async function getSignedChartUrl(path: string): Promise<string> {
  // In production, this would use cloud storage (S3, Azure Blob, etc.)
  // For prototype with Neon, charts are processed via the demo sample text
  return `/api/charts/${encodeURIComponent(path)}`;
}

// Backwards compatibility - supabaseAdmin shim that provides a query-like interface
// This allows existing code to work with minimal changes
export const supabaseAdmin = {
  from: (table: string) => createQueryBuilder(table),
};

interface QueryBuilder {
  select: (columns?: string, options?: { count?: string; head?: boolean }) => QueryBuilder;
  insert: (data: Record<string, unknown> | Record<string, unknown>[]) => QueryBuilder;
  update: (data: Record<string, unknown>) => QueryBuilder;
  upsert: (data: Record<string, unknown> | Record<string, unknown>[], options?: { onConflict?: string }) => QueryBuilder;
  delete: () => QueryBuilder;
  eq: (column: string, value: unknown) => QueryBuilder;
  neq: (column: string, value: unknown) => QueryBuilder;
  in: (column: string, values: unknown[]) => QueryBuilder;
  lt: (column: string, value: unknown) => QueryBuilder;
  lte: (column: string, value: unknown) => QueryBuilder;
  gt: (column: string, value: unknown) => QueryBuilder;
  gte: (column: string, value: unknown) => QueryBuilder;
  like: (column: string, value: string) => QueryBuilder;
  ilike: (column: string, value: string) => QueryBuilder;
  is: (column: string, value: null) => QueryBuilder;
  not: (column: string, operator: string, value: unknown) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  limit: (count: number) => QueryBuilder;
  single: () => Promise<{ data: any; error: any; count?: number }>;
  then: (resolve: (value: { data: any; error: any; count?: number }) => void) => Promise<void>;
}

function createQueryBuilder(table: string): QueryBuilder {
  let operation: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  let selectColumns = '*';
  let insertData: Record<string, unknown> | Record<string, unknown>[] | null = null;
  let updateData: Record<string, unknown> | null = null;
  let upsertData: Record<string, unknown> | Record<string, unknown>[] | null = null;
  let upsertConflict: string | undefined;
  const conditions: { clause: string; params: unknown[] }[] = [];
  let orderByColumn: string | null = null;
  let orderAsc = true;
  let limitCount: number | null = null;
  let isSingle = false;
  let isCountOnly = false;
  let isHeadOnly = false;
  // Track join columns for select queries
  const joinSelects: string[] = [];

  // Reverse FK map: when selecting from `review_cases` and joining `ai_analyses`,
  // the FK lives on the child (`ai_analyses.case_id`), not the parent.
  // key = child table, value = FK column on child pointing to parent
  const reverseJoins: Record<string, { parentTable: string; fkColumn: string }> = {
    ai_analyses: { parentTable: 'review_cases', fkColumn: 'case_id' },
    review_results: { parentTable: 'review_cases', fkColumn: 'case_id' },
    corrective_actions: { parentTable: 'companies', fkColumn: 'company_id' },
  };

  function singularize(word: string): string {
    // Handles common English plurals. Good enough for our table names.
    if (/ies$/i.test(word)) return word.replace(/ies$/i, 'y');       // companies → company
    if (/ses$/i.test(word)) return word.replace(/es$/i, '');         // analyses → analysis (close enough)
    if (/ches$|shes$|xes$/i.test(word)) return word.replace(/es$/i, '');
    if (/s$/i.test(word) && !/ss$/i.test(word)) return word.replace(/s$/i, '');
    return word;
  }

  function parseSelectColumns(cols: string): { directCols: string[]; joins: { alias: string; table: string; columns: string }[] } {
    // Parse Supabase-style select with joins like: "*, provider:providers(first_name, last_name)"
    const joins: { alias: string; table: string; columns: string }[] = [];
    const directCols: string[] = [];

    // Split by commas but not inside parentheses
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    for (const char of cols) {
      if (char === '(') depth++;
      if (char === ')') depth--;
      if (char === ',' && depth === 0) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) parts.push(current.trim());

    for (const part of parts) {
      // Normalize internal whitespace/newlines so "provider:providers (*)" parses too
      const p = part.replace(/\s+/g, '');
      const joinMatchInner = p.match(/^(\w+):(\w+)!inner\((.+)\)$/);
      const joinMatch = p.match(/^(\w+):(\w+)\((.+)\)$/);
      const joinMatchNoAlias = p.match(/^(\w+)\((.+)\)$/);
      if (joinMatch) {
        joins.push({ alias: joinMatch[1], table: joinMatch[2], columns: joinMatch[3] });
      } else if (joinMatchInner) {
        joins.push({ alias: joinMatchInner[1], table: joinMatchInner[2], columns: joinMatchInner[3] });
      } else if (joinMatchNoAlias) {
        // No alias: table(cols) — singularize table name for FK column
        const tbl = joinMatchNoAlias[1];
        const alias = singularize(tbl);
        joins.push({ alias, table: tbl, columns: joinMatchNoAlias[2] });
      } else {
        directCols.push(part);
      }
    }

    return { directCols, joins };
  }

  const builder: QueryBuilder = {
    select(columns?: string, options?: { count?: string; head?: boolean }) {
      // Don't override operation if already set to insert/upsert/update/delete
      // (Supabase uses .select() after mutations to request RETURNING data)
      if (operation === 'select' || !insertData && !updateData && !upsertData && operation !== 'delete') {
        operation = 'select';
      }
      if (columns) selectColumns = columns;
      if (options?.count) isCountOnly = true;
      if (options?.head) isHeadOnly = true;
      return builder;
    },
    insert(data) {
      operation = 'insert';
      insertData = data;
      return builder;
    },
    update(data) {
      operation = 'update';
      updateData = data;
      return builder;
    },
    upsert(data, options) {
      operation = 'upsert';
      upsertData = data;
      upsertConflict = options?.onConflict;
      return builder;
    },
    delete() {
      operation = 'delete';
      return builder;
    },
    eq(column, value) {
      conditions.push({ clause: `${table}.${column} = $PARAM`, params: [value] });
      return builder;
    },
    neq(column, value) {
      conditions.push({ clause: `${table}.${column} != $PARAM`, params: [value] });
      return builder;
    },
    in(column, values) {
      if (values.length === 0) {
        conditions.push({ clause: 'FALSE', params: [] });
      } else {
        const placeholders = values.map(() => '$PARAM').join(', ');
        conditions.push({ clause: `${table}.${column} IN (${placeholders})`, params: values });
      }
      return builder;
    },
    lt(column, value) {
      conditions.push({ clause: `${table}.${column} < $PARAM`, params: [value] });
      return builder;
    },
    lte(column, value) {
      conditions.push({ clause: `${table}.${column} <= $PARAM`, params: [value] });
      return builder;
    },
    gt(column, value) {
      conditions.push({ clause: `${table}.${column} > $PARAM`, params: [value] });
      return builder;
    },
    gte(column, value) {
      conditions.push({ clause: `${table}.${column} >= $PARAM`, params: [value] });
      return builder;
    },
    like(column, value) {
      conditions.push({ clause: `${table}.${column} LIKE $PARAM`, params: [value] });
      return builder;
    },
    ilike(column, value) {
      conditions.push({ clause: `${table}.${column} ILIKE $PARAM`, params: [value] });
      return builder;
    },
    is(column, value) {
      conditions.push({ clause: `${table}.${column} IS NULL`, params: [] });
      return builder;
    },
    not(column, operator, value) {
      if (operator === 'is' && value === null) {
        conditions.push({ clause: `${table}.${column} IS NOT NULL`, params: [] });
      } else if (operator === 'eq') {
        conditions.push({ clause: `${table}.${column} != $PARAM`, params: [value] });
      } else if (operator === 'in') {
        const vals = value as unknown[];
        if (vals.length > 0) {
          const placeholders = vals.map(() => '$PARAM').join(', ');
          conditions.push({ clause: `${table}.${column} NOT IN (${placeholders})`, params: vals });
        }
      }
      return builder;
    },
    order(column, options) {
      orderByColumn = column;
      orderAsc = options?.ascending !== false;
      return builder;
    },
    limit(count) {
      limitCount = count;
      return builder;
    },
    single() {
      isSingle = true;
      return execute();
    },
    then(resolve) {
      return execute().then(resolve);
    },
  };

  async function execute(): Promise<{ data: any; error: any; count?: number }> {
    // Helper: run parameterized query
    async function runQuery(sqlStr: string, params: unknown[]): Promise<any[]> {
      return await execSql(sqlStr, params);
    }
    let allParams: unknown[] = [];
    let paramIndex = 1;

    function buildWhereClause(): string {
      if (conditions.length === 0) return '';
      const clauses = conditions.map(c => {
        let clause = c.clause;
        for (const p of c.params) {
          clause = clause.replace('$PARAM', `$${paramIndex++}`);
          allParams.push(p);
        }
        return clause;
      });
      return ' WHERE ' + clauses.join(' AND ');
    }

    try {
      if (operation === 'select') {
        if (isCountOnly && isHeadOnly) {
          const where = buildWhereClause();
          const sql = `SELECT COUNT(*) as count FROM ${table}${where}`;
          const result = await runQuery(sql, allParams);
          return { data: null, error: null, count: parseInt(result[0]?.count as string || '0') };
        }

        const { directCols, joins } = parseSelectColumns(selectColumns);

        // Build main select
        let mainCols = directCols.map(c => c === '*' ? `${table}.*` : `${table}.${c}`).join(', ');

        // Add join columns — handle reverse FK vs forward FK
        const joinClauses: string[] = [];
        const reverseJoinSelects: string[] = []; // aggregated subqueries for reverse joins
        const forwardJoins: typeof joins = [];

        for (const join of joins) {
          const reverse = reverseJoins[join.table];
          const isReverse = reverse && reverse.parentTable === table;
          if (isReverse) {
            // Build an aggregated subquery so `alias` returns an array of rows
            // (matching Supabase's behavior for one-to-many relationships).
            const jCols = join.columns.split(',').map(c => c.trim());
            const colsList = jCols[0] === '*'
              ? `row_to_json(sub)`
              : `json_build_object(${jCols.map(c => `'${c}', sub.${c}`).join(', ')})`;
            const sub = `COALESCE((
              SELECT json_agg(${colsList})
              FROM ${join.table} sub
              WHERE sub.${reverse.fkColumn} = ${table}.id
            ), '[]'::json) as ${join.alias}`;
            reverseJoinSelects.push(sub);
          } else {
            forwardJoins.push(join);
          }
        }

        for (const join of forwardJoins) {
          const jCols = join.columns.split(',').map(c => c.trim());
          joinClauses.push(`LEFT JOIN ${join.table} ON ${join.table}.id = ${table}.${join.alias}_id`);
          if (jCols.length === 1 && jCols[0] === '*') {
            // Select all columns as a flat JSON object (no {"*": ...} wrapper)
            mainCols += `, row_to_json(${join.table}.*) as ${join.alias}`;
          } else {
            const colsList = jCols.map(c => `'${c}', ${join.table}.${c}`).join(', ');
            mainCols += `, json_build_object(${colsList}) as ${join.alias}`;
          }
        }

        // Remove duplicate table.* if joins add columns
        if (forwardJoins.length > 0 && directCols.includes('*')) {
          mainCols = `${table}.*` + forwardJoins.map(j => {
            const jCols = j.columns.split(',').map(c => c.trim());
            if (jCols.length === 1 && jCols[0] === '*') {
              return `, row_to_json(${j.table}.*) as ${j.alias}`;
            }
            const colsList = jCols.map(c => `'${c}', ${j.table}.${c}`).join(', ');
            return `, json_build_object(${colsList}) as ${j.alias}`;
          }).join('');
        }

        // Append reverse-join subqueries
        if (reverseJoinSelects.length > 0) {
          mainCols += ', ' + reverseJoinSelects.join(', ');
        }

        const where = buildWhereClause();
        let sql = `SELECT ${mainCols} FROM ${table} ${joinClauses.join(' ')}${where}`;

        if (orderByColumn) {
          sql += ` ORDER BY ${table}.${orderByColumn} ${orderAsc ? 'ASC' : 'DESC'}`;
        }
        if (limitCount) {
          sql += ` LIMIT ${limitCount}`;
        }

        const result = await runQuery(sql, allParams);

        if (isSingle) {
          return { data: result[0] || null, error: result[0] ? null : { message: 'Not found' } };
        }
        return { data: result, error: null };
      }

      if (operation === 'insert') {
        const rows = Array.isArray(insertData) ? insertData : [insertData];
        const results: any[] = [];
        for (const row of rows) {
          if (!row) continue;
          const keys = Object.keys(row);
          const vals = Object.values(row);
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
          const res = await runQuery(sql, vals);
          results.push(res[0]);
        }
        return { data: results.length === 1 ? results[0] : results, error: null };
      }

      if (operation === 'update') {
        if (!updateData) return { data: null, error: { message: 'No update data' } };
        const keys = Object.keys(updateData);
        const vals = Object.values(updateData);
        const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
        paramIndex = keys.length + 1;
        allParams = [...vals];
        const where = buildWhereClause();
        const sql = `UPDATE ${table} SET ${setClause}${where} RETURNING *`;
        const result = await runQuery(sql, allParams);
        return { data: isSingle ? (result[0] || null) : result, error: null };
      }

      if (operation === 'upsert') {
        if (!upsertData) return { data: null, error: { message: 'No upsert data' } };
        const rows = Array.isArray(upsertData) ? upsertData : [upsertData];
        const results: any[] = [];
        for (const row of rows) {
          const keys = Object.keys(row);
          const vals = Object.values(row);
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          const conflictCol = upsertConflict || 'id';
          const updateClause = keys.filter(k => k !== conflictCol).map(k => `${k} = EXCLUDED.${k}`).join(', ');
          const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) ON CONFLICT (${conflictCol}) DO UPDATE SET ${updateClause} RETURNING *`;
          const res = await runQuery(sql, vals);
          results.push(res[0]);
        }
        return { data: results.length === 1 ? results[0] : results, error: null };
      }

      if (operation === 'delete') {
        const where = buildWhereClause();
        const sql = `DELETE FROM ${table}${where} RETURNING *`;
        const result = await runQuery(sql, allParams);
        return { data: result, error: null };
      }

      return { data: null, error: { message: 'Unknown operation' } };
    } catch (err: any) {
      console.log('[DB ERROR]', err.message);
      return { data: null, error: { message: err.message } };
    }
  }

  return builder;
}
