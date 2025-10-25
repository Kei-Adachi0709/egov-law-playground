import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { ThemeToggle } from './ThemeToggle';

const navItems = [
  { to: '/', label: 'Home', detail: 'Overview' },
  { to: '/gacha', label: 'Gacha', detail: 'Random discovery' },
  { to: '/quiz', label: 'Quiz', detail: 'Knowledge check' },
  { to: '/hunter', label: 'Hunter', detail: 'Advanced search' }
];

const linkBaseClasses =
  'flex flex-col rounded-full px-4 py-2 text-base font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:px-3 md:py-2 md:text-sm';

export const NavBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-slate-700 dark:bg-slate-900/80 dark:supports-[backdrop-filter]:bg-slate-900/60">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:py-4">
        <NavLink
          to="/"
          className="text-lg font-bold tracking-tight text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          eGov Law Playground
        </NavLink>
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setIsOpen((prev: boolean) => !prev)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            aria-expanded={isOpen}
            aria-controls="primary-navigation"
            aria-label="メニューの開閉"
          >
            <span aria-hidden="true">
              {isOpen ? (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              )}
            </span>
          </button>
        </div>
        <nav
          id="primary-navigation"
          aria-label="主要メニュー"
          className={`${
            isOpen ? 'block' : 'hidden'
          } absolute left-0 right-0 top-full z-20 mx-4 mt-2 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg transition md:static md:block md:mx-0 md:mt-0 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
        >
          <ul className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  aria-label={`${item.label} – ${item.detail}`}
                  className={({ isActive }: { isActive: boolean }) =>
                    `${linkBaseClasses} ${
                      isActive
                        ? 'bg-primary text-white shadow-sm dark:bg-primary/90'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-white'
                    }`
                  }
                >
                  <span>{item.label}</span>
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400 md:hidden">
                    {item.detail}
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden md:flex md:items-center md:gap-3">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
