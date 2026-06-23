#!/usr/bin/env python3
"""Fix type errors in frontend by casting new RPC calls."""
import re

# Fix trackCtaClick in job detail page
detail_path = "/root/Aetherlink/apps/webapp/src/app/(dashboard)/feed/[id]/page.tsx"
with open(detail_path, "r") as f:
    content = f.read()

# The issue: supabase.rpc('track_cta_click') — the generated types don't know about this yet
# Fix: cast to any
content = content.replace(
    "await supabase.rpc('track_cta_click', {",
    "await (supabase as any).rpc('track_cta_click', {",
)

# Fix markJobApplied in MarkAsAppliedButton
content = content.replace(
    "await supabase.rpc('mark_job_applied', { p_job_id: jobId });",
    "await (supabase as any).rpc('mark_job_applied', { p_job_id: jobId });",
)

# Fix toggleSaveJob in SaveJobButton
content = content.replace(
    "await supabase.rpc('toggle_save_job', { p_job_id: jobId });",
    "await (supabase as any).rpc('toggle_save_job', { p_job_id: jobId });",
)

with open(detail_path, "w") as f:
    f.write(content)

print("✅ Fixed RPC type casts in job detail page")

# Fix applied page
applied_path = "/root/Aetherlink/apps/webapp/src/app/(dashboard)/applied/page.tsx"
with open(applied_path, "r") as f:
    content = f.read()

# Fix list_saved_jobs RPC call
content = content.replace(
    "const { data, error } = await supabase.rpc('list_saved_jobs');",
    "const { data, error } = await (supabase as any).rpc('list_saved_jobs');",
)

# Fix saved_jobs table delete
content = content.replace(
    """await supabase
        .from('saved_jobs')
        .delete()
        .eq('job_id', jobId)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);""",
    """await (supabase as any)
        .from('saved_jobs')
        .delete()
        .eq('job_id', jobId)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);""",
)

with open(applied_path, "w") as f:
    f.write(content)

print("✅ Fixed RPC type casts in applied page")
