#!/usr/bin/env python3
"""
Apply the CV Journey migration to Supabase.
This script uses the Supabase Management API (available through the dashboard)
to execute SQL. It requires a Supabase Management API key (starts with 'sb_...'
or a dashboard session token).

If you have the dashboard open, you can:
1. Open the SQL Editor in Supabase Dashboard
2. Paste the contents of apps/backend/supabase/migrations/20260623000003_add_cv_journey.sql
3. Click "Run"

Alternatively, if you have psql access:
  psql "postgresql://postgres:***@db.scchmywreefttabwlhoz.supabase.co:5432/postgres" \
    -f apps/backend/supabase/migrations/20260623000003_add_cv_journey.sql

Usage:
  python3 scripts/apply_cv_migration.py --method {sql_editor,psql,rest}
"""
import argparse
import os
import sys

MIGRATION_PATH = "apps/backend/supabase/migrations/20260623000003_add_cv_journey.sql"


def read_migration():
    with open(MIGRATION_PATH) as f:
        return f.read()


def apply_via_sql_editor():
    """Print instructions for applying via Supabase SQL Editor."""
    sql = read_migration()
    print("=" * 70)
    print("APPLY MIGRATION VIA SUPABASE SQL EDITOR")
    print("=" * 70)
    print()
    print("1. Open: https://supabase.com/dashboard/project/scchmywreefttabwlhoz/sql/new")
    print("2. Copy and paste the following SQL:")
    print()
    print("-" * 70)
    print(sql)
    print("-" * 70)
    print()
    print("3. Click 'Run' to execute the migration.")
    print("4. Verify with: SELECT table_name FROM information_schema.tables")
    print("   WHERE table_schema = 'public' AND table_name IN ('cv_conversations', 'generated_cvs');")
    print()


def apply_via_psql(ps_url):
    """Apply migration via psql."""
    import subprocess
    sql = read_migration()
    result = subprocess.run(
        ["psql", ps_url, "-v", "ON_ERROR_STOP=1", "-f", MIGRATION_PATH],
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        print("[OK] Migration applied successfully via psql.")
        if result.stdout:
            print(result.stdout[-500:])
    else:
        print(f"[FAIL] psql failed: {result.stderr[-500:]}")
        sys.exit(1)


def verify_migration():
    """Verify the migration was applied by checking table existence via REST."""
    import json
    try:
        from supabase import create_client
    except ImportError:
        print("Install supabase-py: pip install supabase")
        return

    creds = {}
    with open("/root/supabase_credentials.env") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                creds[k.strip()] = v.strip()

    url = creds.get("NEXT_PUBLIC_SUPABASE_URL")
    key = creds.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        print("Missing credentials")
        return

    sb = create_client(url, key)
    tables_to_check = ["cv_conversations", "generated_cvs"]
    results = []

    for table in tables_to_check:
        try:
            resp = sb.table(table).select("*").limit(1).execute()
            results.append({"table": table, "ok": True, "count": getattr(resp, "count", "unknown")})
        except Exception as e:
            error_msg = str(e)
            if "permission denied" in error_msg:
                results.append({"table": table, "ok": "maybe", "error": "RLS blocked (table may exist)"})
            elif "Could not find" in error_msg:
                results.append({"table": table, "ok": False, "error": "Table does not exist"})
            else:
                results.append({"table": table, "ok": False, "error": error_msg[:100]})

    print(json.dumps(results, indent=2, default=str))

    # Also check RPCs
    print("\nChecking RPCs...")
    for fn in ["save_generated_cv", "get_latest_generated_cv"]:
        try:
            # Try calling with null params to see if it exists (will fail with different error if exists)
            sb.rpc(fn, {}).execute()
            print(f"  {fn}: exists (unexpected success)")
        except Exception as e:
            error_msg = str(e)
            if "Could not find" in error_msg:
                print(f"  {fn}: NOT FOUND")
            elif "permission denied" in error_msg:
                print(f"  {fn}: likely exists (RLS blocked)")
            elif "null value" in error_msg or "check constraint" in error_msg:
                print(f"  {fn}: exists (parameter validation failed = function exists)")
            else:
                print(f"  {fn}: exists (error: {error_msg[:60]})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Apply CV Journey migration to Supabase")
    parser.add_argument("--method", choices=["sql_editor", "psql", "verify"], default="sql_editor",
                        help="How to apply the migration")
    parser.add_argument("--psql-url", help="PostgreSQL connection string for psql method")
    args = parser.parse_args()

    if args.method == "sql_editor":
        apply_via_sql_editor()
    elif args.method == "psql":
        if not args.psql_url:
            print("Provide --psql-url for psql method")
            sys.exit(1)
        apply_via_psql(args.psql_url)
    elif args.method == "verify":
        verify_migration()
