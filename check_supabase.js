const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Read credentials from the credentials file
const credContent = fs.readFileSync('/root/supabase_credentials.env', 'utf-8');
const creds = {};
for (const line of credContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const [k, ...vParts] = trimmed.split('=');
    creds[k.trim()] = vParts.join('=').trim();
  }
}

const supabaseUrl = creds['NEXT_PUBLIC_SUPABASE_URL'];
const serviceKey = creds['SUPABASE_SERVICE_ROLE_KEY'];

console.log('URL:', supabaseUrl);
console.log('Service key length:', serviceKey?.length);

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  // 1. Get latest 5 jobs
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('*')
    .order('id', { ascending: false })
    .limit(5);

  if (error) {
    console.error('ERROR fetching jobs:', JSON.stringify(error, null, 2));
    process.exit(1);
  }

  console.log('=== LATEST 5 JOBS ===');
  console.log(JSON.stringify(jobs, null, 2));

  // 2. Count pending vs completed classification
  const { data: pending, error: e1 } = await supabase
    .from('jobs')
    .select('id', { count: 'exact' })
    .eq('classification_status', 'pending');

  const { data: completed, error: e2 } = await supabase
    .from('jobs')
    .select('id', { count: 'exact' })
    .eq('classification_status', 'completed');

  console.log('\n=== CLASSIFICATION STATUS ===');
  console.log('Pending count:', pending?.length ?? 'error');
  console.log('Completed count:', completed?.length ?? 'error');
  if (e1) console.error('Pending error:', JSON.stringify(e1));
  if (e2) console.error('Completed error:', JSON.stringify(e2));

  // 3. Check for duplicates
  const { data: dupes, error: e3 } = await supabase
    .from('jobs')
    .select('title, company, location')
    .not('title', 'is', null)
    .not('company', 'is', null);

  console.log('\n=== DUPLICATE CHECK ===');
  if (e3) {
    console.error('Dupe check error:', JSON.stringify(e3));
  } else if (dupes) {
    const seen = new Map();
    for (const job of dupes) {
      const key = `${job.title}|${job.company}|${job.location}`;
      seen.set(key, (seen.get(key) || 0) + 1);
    }
    const duplicates = [...seen.entries()].filter(([_, count]) => count > 1);
    console.log('Total unique combos:', seen.size);
    console.log('Duplicates found:', duplicates.length);
    if (duplicates.length > 0) {
      console.log('Duplicate entries:', JSON.stringify(duplicates.slice(0, 5)));
    }
  }

  // 4. Total count
  const { count: total, error: e4 } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true });

  console.log('\n=== TOTAL ===');
  console.log('Total jobs:', total);
  if (e4) console.error('Total error:', JSON.stringify(e4));
}

main();
