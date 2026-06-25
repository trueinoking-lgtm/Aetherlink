const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const creds = {};
const content = fs.readFileSync('/root/supabase_credentials.env', 'utf-8');
for (const line of content.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const [k, ...vParts] = trimmed.split('=');
    creds[k.trim()] = vParts.join('=').trim();
  }
}
const supabase = createClient(creds['NEXT_PUBLIC_SUPABASE_URL'], creds['SUPABASE_SERVICE_ROLE_KEY']);

async function main() {
  // Jobs created today
  const { data: todayJobs, error: e1 } = await supabase
    .from('jobs')
    .select('id, parser_status, status, created_at, is_publishable')
    .gte('created_at', '2026-06-25')
    .order('id', { ascending: false });

  console.log('Today jobs:', todayJobs ? todayJobs.length : 'error');
  
  if (todayJobs) {
    const counts = {};
    for (const j of todayJobs) {
      counts[j.parser_status || 'null'] = (counts[j.parser_status || 'null'] || 0) + 1;
    }
    console.log('Parser status today:', JSON.stringify(counts));
  }

  // Jobs in last 2 hours
  const twoHoursAgo = new Date(Date.now() - 2*3600*1000).toISOString();
  const { data: recent, error: e2 } = await supabase
    .from('jobs')
    .select('id, created_at')
    .gte('created_at', twoHoursAgo)
    .order('id', { ascending: false });
  console.log('Jobs in last 2h:', recent ? recent.length : 'error');
  if (recent && recent.length > 0) {
    console.log('Most recent job:', JSON.stringify(recent[0]));
  }

  // Publishable count
  const { data: pubData, error: e3 } = await supabase
    .from('jobs')
    .select('is_publishable')
    .eq('is_publishable', true);
  console.log('Publishable jobs:', pubData ? pubData.length : 'error');

  // Pending parser status from today
  if (todayJobs) {
    const pending = todayJobs.filter(j => j.parser_status === 'pending');
    console.log('Pending parser jobs today:', pending.length);
  }
}

main().catch(e => console.error(e));
