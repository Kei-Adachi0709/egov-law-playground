import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './Layout';

const HomePage = lazy(() => import('../pages/Home').then((module) => ({ default: module.HomePage })));
const GachaPage = lazy(() => import('../pages/Gacha').then((module) => ({ default: module.GachaPage })));
const QuizPage = lazy(() => import('../pages/Quiz').then((module) => ({ default: module.QuizPage })));
const HunterPage = lazy(() => import('../pages/Hunter').then((module) => ({ default: module.HunterPage })));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'gacha', element: <GachaPage /> },
      { path: 'quiz', element: <QuizPage /> },
      { path: 'hunter', element: <HunterPage /> }
    ]
  }
]);
