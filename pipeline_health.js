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
  // Get latest job to see all columns
  const { data: latest } = await supabase.from('jobs').select('*').order('id', { ascending: false }).limit(1);
  
  if (latest && latest.length > 0) {
    const job = latest[0];
    console.log('=== COLUMN NAMES ===');
    console.log(Object.keys(job).join(', '));
    
    console.log('\n=== LATEST JOB SUMMARY ===');
    console.log('id:', job.id);
    console.log('title:', job.title);
    console.log('companyName:', job.companyName);
    console.log('location:', job.location);
    console.log('created_at:', job.created_at);
    console.log('status:', job.status);
    console.log('parser_status:', job.parser_status);
    console.log('is_publishable:', job.is_publishable);
    console.log('is_shared:', job.is_shared);
    console.log('labels:', JSON.stringify(job.labels));
    console.log('tags:', JSON.stringify(job.tags));
  }

  // Count by status
  const { data: byStatus, error: e1 } = await supabase
    .from('jobs')
    .select('status')
    .then(r => {
      if (r.error) return r;
      const counts = {};
      for (const row of r.data) {
        counts[row.status] = (counts[row.status] || 0) + 1;
      }
      return { data: Object.entries(counts).map(([status, count]) => ({ status, count })), error: null };
    });
  
  console.log('\n=== STATUS COUNTS ===');
  if (e1) console.error(e1);
  else console.log(JSON.stringify(byStatus, null, 2));

  // Count by parser_status
  const { data: byParser, error: e2 } = await supabase
    .from('jobs')
    .select('parser_status')
    .then(r => {
      if (r.error) return r;
      const counts = {};
      for (const row of r.data) {
        counts[row.parser_status || 'null'] = (counts[row.parser_status || 'null'] || 0) + 1;
      }
      return { data: Object.entries(counts).map(([parser_status, count]) => ({ parser_status, count })), error: null };
    });
  
  console.log('\n=== PARSER_STATUS COUNTS ===');
  if (e2) console.error(e2);
  else console.log(JSON.stringify(byParser, null, 2));

  // Check for duplicates by title + companyName + location
  const { data: allJobs, error: e3 } = await supabase
    .from('jobs')
    .select('title, companyName, location')
    .not('title', 'is', null);
  
  console.log('\n=== DUPLICATE CHECK ===');
  if (e3) {
    console.error(e3);
  } else if (allJobs) {
    const seen = new Map();
    for (const job of allJobs) {
      const key = `${job.title}|${job.companyName}|${job.location}`;
      seen.set(key, (seen.get(key) || 0) + 1);
    }
    const duplicates = [...seen.entries()].filter(([_, count]) => count > 1);
    console.log('Total unique combos:', seen.size);
    console.log('Duplicates found:', duplicates.length);
    if (duplicates.length > 0) {
      console.log('Top duplicates:', JSON.stringify(duplicates.slice(0, 10), null, 2));
    }
  }

  // Jobs created in last 24 hours
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const { count: recentCount, error: e4 } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', twoDaysAgo);
  
  console.log('\n=== RECENCY ===');
  console.log('Jobs in last 24h:', recentCount);
  if (e4) console.error(e4);
}

main();
