// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-dashboard-token',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

const TABLE_NAME = Deno.env.get('CHAT_HISTORIES_TABLE') || 'n8n_chat_histories';
const DASHBOARD_ACCESS_TOKEN = Deno.env.get('DASHBOARD_ACCESS_TOKEN') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const PAGE_SIZE = 500;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

function sanitizeRow(row: Record<string, unknown>) {
  const allowedKeys = [
    'id',
    'session_id',
    'company_name',
    'company',
    'business_name',
    'organization',
    'metadata',
    'chat_history',
    'messages',
    'history',
    'transcript',
    'conversation',
    'payload',
    'data',
    'last_message',
    'message',
    'summary',
    'created_at',
    'timestamp',
    'createdAt',
    'date',
    'inserted_at',
    'updated_at'
  ];

  const sanitized: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      sanitized[key] = row[key];
    }
  }

  return sanitized;
}

async function fetchRows(supabase: ReturnType<typeof createClient>, tableName: string, explicitLimit: number) {
  const rows: Record<string, unknown>[] = [];
  let offset = 0;

  while (true) {
    const upperBound = offset + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(offset, upperBound);

    if (error) {
      return { rows: [], error };
    }

    const batch = Array.isArray(data) ? data : [];
    if (batch.length === 0) {
      break;
    }

    rows.push(...batch);

    if (explicitLimit > 0 && rows.length >= explicitLimit) {
      return { rows: rows.slice(0, explicitLimit), error: null };
    }

    if (batch.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;

    // Safety guard for unexpectedly huge datasets.
    if (offset > 500000) {
      break;
    }
  }

  return { rows, error: null };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'Missing Supabase server credentials' }, 500);
  }

  if (!DASHBOARD_ACCESS_TOKEN) {
    return json({ error: 'Missing dashboard access token configuration' }, 500);
  }

  const providedToken = request.headers.get('x-dashboard-token') || '';
  if (providedToken !== DASHBOARD_ACCESS_TOKEN) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const company = (url.searchParams.get('company') || '').trim().toLowerCase();
  const date = (url.searchParams.get('date') || '').trim();
  const limitValue = Number(url.searchParams.get('limit') || '0');
  const limit = Number.isFinite(limitValue) ? Math.max(limitValue, 0) : 0;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const fetched = await fetchRows(supabase, TABLE_NAME, limit);
  let data = fetched.rows;
  let error = fetched.error;

  if (error) {
    return json({ error: error.message }, 500);
  }

  let rows = Array.isArray(data) ? data : [];

  rows.sort((a, b) => {
    const aDate = new Date(String(a.created_at || a.timestamp || a.createdAt || a.date || a.inserted_at || a.updated_at || '')).getTime();
    const bDate = new Date(String(b.created_at || b.timestamp || b.createdAt || b.date || b.inserted_at || b.updated_at || '')).getTime();
    if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) return bDate - aDate;
    return Number(b.id || 0) - Number(a.id || 0);
  });

  if (company) {
    rows = rows.filter((row) => {
      const values = [row.company_name, row.company, row.business_name, row.organization]
        .filter((value) => typeof value === 'string')
        .map((value) => String(value).toLowerCase());
      return values.some((value) => value.includes(company));
    });
  }

  if (date) {
    rows = rows.filter((row) => {
      const rawDate = row.created_at || row.timestamp || row.createdAt || row.date || row.inserted_at || row.updated_at;
      if (!rawDate) return false;
      const parsed = new Date(String(rawDate));
      if (Number.isNaN(parsed.getTime())) return false;
      return parsed.toISOString().slice(0, 10) === date;
    });
  }

  return json({ rows: rows.map((row) => sanitizeRow(row as Record<string, unknown>)) });
});
