import { Outlet } from 'react-router-dom';
import { NavBar } from '../components/NavBar';

export const Layout = () => {
  return (
    <div className="min-h-screen bg-surface-light text-slate-900 transition-colors duration-300 dark:bg-surface-dark dark:text-slate-100">
      <NavBar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white/60 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
        © {new Date().getFullYear()} eGov Law Playground
      </footer>
    </div>
  );
};
