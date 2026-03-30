import { Outlet, NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Quests', icon: '⚔️' },
  { to: '/profile', label: 'Perfil', icon: '👤' },
];

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-dark-800 border-b border-dark-700 px-4 py-3 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-primary-400">LifeQuest</h1>
        <span className="text-xs text-dark-600 bg-dark-700 px-2 py-1 rounded">v0.1 beta</span>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-dark-700 flex justify-around py-2 safe-area-bottom">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-4 py-1 rounded-lg transition-colors ${
                isActive ? 'text-primary-400' : 'text-dark-600 hover:text-white'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
