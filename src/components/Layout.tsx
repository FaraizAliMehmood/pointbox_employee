import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import LanguageSelector from './LanguageSelector';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <header className="bg-white/10 backdrop-blur-md shadow-sm border-b border-white/20 px-4 lg:px-6 py-4 overflow-visible">
          <div className="flex justify-end relative">
            <LanguageSelector />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-white/5 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl p-4 lg:p-6 min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;

