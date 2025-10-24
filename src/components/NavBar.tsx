import { NavLink } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

const navItems = [
  { to: '/', label: 'ホーム' },
  { to: '/gacha', label: 'ガチャ' },
  { to: '/quiz', label: 'クイズ' },
  { to: '/hunter', label: 'ハンター' }
];

export const NavBar = () => {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/80">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <NavLink to="/" className="text-lg font-bold text-primary">
          eGov Law Playground
        </NavLink>
        <nav className="flex items-center gap-6">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }: { isActive: boolean }) =>
                `text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`
              }
              end={item.to === '/'}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
};
