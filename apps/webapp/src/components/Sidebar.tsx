'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Profile } from '@aetherlink/core';
import { signOut } from '@/app/actions';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: HomeIcon },
  { href: '/feed', label: 'Jobs', icon: JobsIcon },
  { href: '/cv', label: 'CV', icon: CVIcon },
  { href: '/applied', label: 'Applied', icon: AppliedIcon },
];

export function Sidebar({
  profile,
  collapsed,
  onToggle,
}: {
  profile: Profile | null;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-full flex-col border-r border-[var(--border)] bg-[var(--bg-base)] transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between border-b border-[var(--border)] px-4">
        {!collapsed && (
          <Link href="/dashboard" className="font-display text-lg font-bold tracking-tight">
            Aether<span className="gradient-text">Link</span>
          </Link>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={collapsed ? 'M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3' : 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5'} />
          </svg>
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-link ${isActive ? 'active' : ''}`}
              title={collapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User area */}
      <div className="border-t border-[var(--border)] p-3 mt-auto">
        <div className={`flex items-center gap-3 rounded-lg p-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dim)] text-sm font-bold text-[var(--text-primary)]">
            {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 flex flex-col gap-0.5">
              <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                {profile?.full_name ?? 'User'}
              </p>
              <form action={async () => { await signOut(); }}>
                <button
                  type="submit"
                  className="text-xs text-[var(--text-muted)] transition hover:text-[var(--accent)] pointer-active"
                >
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

/* Inline SVG icons */
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function JobsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
    </svg>
  );
}

function CVIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function AppliedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
