'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '▦' },
  { href: '/requests', label: 'Requests', icon: '≡' },
  { href: '/agents', label: 'Field Agents', icon: '◉' },
  { href: '/media', label: 'Media & Verify', icon: '⊡' },
  { href: '/notifications', label: 'Notifications', icon: '◎' },
  { href: '/analytics', label: 'Analytics', icon: '∿' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-6 dark:border-gray-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm">
          SS
        </div>
        <span className="font-semibold text-gray-900 dark:text-white">
          SahayaSetu
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-indigo-50 text-indigo-700 font-medium dark:bg-indigo-900/30 dark:text-indigo-300'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium text-sm dark:bg-indigo-900/40 dark:text-indigo-300">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">Admin</p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">admin@sahayasetu.in</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
