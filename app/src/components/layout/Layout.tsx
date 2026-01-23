import React from 'react';
import { TopBar } from './TopBar';
import { TabNav } from './TabNav';

interface LayoutProps {
  children: React.ReactNode;
  isLocked: boolean;
  onLock: () => void;
  showTabs?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  isLocked,
  onLock,
  showTabs = true
}) => {
  return (
    <div className="min-h-screen bg-hacker-black text-hacker-white flex flex-col">
      <TopBar isLocked={isLocked} onLock={onLock} />
      {showTabs && <TabNav />}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
};
