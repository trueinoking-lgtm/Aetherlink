#!/usr/bin/env node
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const credContent = fs.readFileSync('/root/supabase_credentials.env', 'utf-8');
const creds = {};
for (const line of credContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const [k, ...vParts] = trimmed.split('=');
    creds[k.trim()] = vParts.join('=').trim();
  }
}

const supabase = createClient(creds['NEXT_PUBLIC_SUPABASE_URL'], creds['SUPABASE_SERVICE_ROLE_KEY']);

async function main() {
  // Latest 5 jobs
  const { data: latest, error: e1 } = await supabase
    .from('jobs')
    .select('id, title, companyName, location, created_at, status, parser_status')
    .order('id', { ascending: false })
    .limit(5);

  if (e1) { console.log('Error:', e1.message); return; }

  const now = new Date();
  const latestCreated = latest.length > 0 ? new Date(latest[0].created_at) : null;
  const hoursAgo = latestCreated ? ((now - latestCreated) / 3600000).toFixed(1) : 'N/A';

  // Pending vs completed classification (using parser_status)
  const { data: allStatus, error: e2 } = await supabase
    .from('jobs')
    .select('parser_status');

  const pending = allStatus ? allStatus.filter(r => r.parser_status === 'pending').length : 0;
  const parsed = allStatus ? allStatus.filter(r => r.parser_status === 'parsed').length : 0;
  const incomplete = allStatus ? allStatus.filter(r => r.parser_status === 'incomplete').length : 0;
  const failed = allStatus ? allStatus.filter(r => r.parser_status === 'failed').length : 0;

  console.log(JSON.stringify({
    latestJobs: latest,
    hoursSinceLastJob: hoursAgo,
    parserStatusCounts: { pending, parsed, incomplete, failed, total: allStatus?.length }
  }, null, 2));
}

main();
