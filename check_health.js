const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Read credentials
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
  // 1. Total count
  const { count: total, error: eTotal } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true });

  // 2. Status counts (using 'status' field, not 'classification_status')
  const { data: statusData, error: eStatus } = await supabase
    .from('jobs')
    .select('status');

  const statusCounts = {};
  if (statusData) {
    for (const row of statusData) {
      statusCounts[row.status || 'null'] = (statusCounts[row.status || 'null'] || 0) + 1;
    }
  }

  // 3. Parser status counts
  const { data: parserData, error: eParser } = await supabase
    .from('jobs')
    .select('parser_status');

  const parserCounts = {};
  if (parserData) {
    for (const row of parserData) {
      parserCounts[row.parser_status || 'null'] = (parserCounts[row.parser_status || 'null'] || 0) + 1;
    }
  }

  // 4. Is publishable count
  const { data: publishable, error: ePub } = await supabase
    .from('jobs')
    .select('id', { count: 'exact' })
    .eq('is_publishable', false);

  // 5. Duplicate check (by companyName + title + location)
  const { data: allJobs, error: eAll } = await supabase
    .from('jobs')
    .select('title, companyName, location');

  let duplicateCount = 0;
  let duplicateGroups = 0;
  if (allJobs) {
    const seen = new Map();
    for (const job of allJobs) {
      const key = `${(job.title||'').toLowerCase()}|${(job.companyName||'').toLowerCase()}|${(job.location||'').toLowerCase()}`;
      if (seen.has(key)) {
        if (seen.get(key) === 1) duplicateGroups++;
        duplicateCount++;
      }
      seen.set(key, (seen.get(key) || 0) + 1);
    }
  }

  // 6. Jobs ingested today (UTC)
  const today = new Date();
  today.setUTCHours(0,0,0,0);
  const todayStr = today.toISOString();
  
  const { count: todayCount, error: eToday } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', todayStr);

  // Result
  const latestCreated = '2026-06-24T06:21:23.213548+00:00';
  const latestDate = new Date(latestCreated);
  const now = new Date();
  const hoursAgo = ((now - latestDate) / 3600000).toFixed(1);

  const report = {
    totalJobs: total,
    latestJob: {
      id: 689,
      title: 'Service Desk Engineer',
      company: 'NetOne Cellular (Private) Limited',
      created_at: latestCreated,
      hours_ago: hoursAgo
    },
    statusCounts,
    parserCounts,
    unreadableCount: publishable?.length ?? 'N/A',
    duplicates: { totalDuplicateRows: duplicateCount, duplicateGroups },
    todayIngested: todayCount,
    errors: {
      status: eStatus ? eStatus.message : null,
      parser: eParser ? eParser.message : null,
      publishable: ePub ? ePub.message : null,
      allJobs: eAll ? eAll.message : null,
      today: eToday ? eToday.message : null,
      total: eTotal ? eTotal.message : null,
    }
  };

  console.log(JSON.stringify(report, null, 2));
}

main();
