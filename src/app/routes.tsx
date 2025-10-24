import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './Layout';
import { HomePage } from '../pages/Home';
import { GachaPage } from '../pages/Gacha';
import { QuizPage } from '../pages/Quiz';
import { HunterPage } from '../pages/Hunter';

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
