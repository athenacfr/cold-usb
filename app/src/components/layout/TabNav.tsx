import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface Tab {
  path: string;
  label: string;
}

const tabs: Tab[] = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/addresses', label: 'Addresses' },
  { path: '/sign', label: 'Sign TX' },
];

export const TabNav: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="border-b border-muted-gray">
      <div className="flex">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`
                px-6 py-4 font-mono uppercase text-sm transition-colors
                ${
                  isActive
                    ? 'text-bitcoin-orange border-b-2 border-bitcoin-orange'
                    : 'text-muted-gray hover:text-hacker-white'
                }
              `}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
