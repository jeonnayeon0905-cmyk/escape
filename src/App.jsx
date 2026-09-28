import { createBrowserRouter, Outlet, RouterProvider, ScrollRestoration, useMatch } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RecordsProvider } from './context/RecordsContext';
import { ToastProvider } from './context/ToastContext';
import { isSupabaseConfigured } from './lib/supabase';
import BottomNav from './components/BottomNav';
import { LoadingState } from './components/ui';
import Home from './pages/Home';
import Records from './pages/Records';
import RecordForm from './pages/RecordForm';
import RecordDetail from './pages/RecordDetail';
import Stats from './pages/Stats';
import Login from './pages/Login';
import Setup from './pages/Setup';

function AppLayout() {
  const { user, loading } = useAuth();
  const newMatch = useMatch('/records/new');
  const editMatch = useMatch('/records/:id/edit');
  const inForm = Boolean(newMatch || editMatch);

  if (loading) {
    return (
      <div className="app">
        <main className="page page--center">
          <LoadingState text="로그인 정보를 확인하는 중…" />
        </main>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="app">
        <Login />
      </div>
    );
  }
  return (
    <RecordsProvider>
      <div className={`app ${inForm ? '' : 'app--with-nav'}`}>
        <Outlet />
        {!inForm && <BottomNav />}
      </div>
      <ScrollRestoration />
    </RecordsProvider>
  );
}

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/records', element: <Records /> },
      { path: '/records/new', element: <RecordForm /> },
      { path: '/records/:id', element: <RecordDetail /> },
      { path: '/records/:id/edit', element: <RecordForm /> },
      { path: '/stats', element: <Stats /> },
      { path: '*', element: <Home /> },
    ],
  },
]);

export default function App() {
  if (!isSupabaseConfigured) {
    return (
      <div className="app">
        <Setup />
      </div>
    );
  }
  return (
    <ToastProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ToastProvider>
  );
}
