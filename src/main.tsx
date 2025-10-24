import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import { ThemeProvider } from './app/ThemeProvider';
import { router } from './app/routes';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Failed to find the root element');
}

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>
);
