import {
  MemoryRouter as Router,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';
import './styles/Global.scss';
import { useEffect, useState } from 'react';
import LoginPage from './components/LoginPage';
import Home from './components/HomePage';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadAuthStatus = async () => {
      try {
        const authStatus =
          await window.electron?.ipcRenderer.invoke('get-auth-status');

        if (isMounted) {
          setIsAuthenticated(Boolean(authStatus));
        }
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    };

    loadAuthStatus();

    const unsubscribeLoginSuccess = window.electron?.ipcRenderer.on(
      'login-successful',
      () => {
        setIsLoggingIn(false);
        setIsAuthenticated(true);
      },
    );

    const unsubscribeLoginCancelled = window.electron?.ipcRenderer.on(
      'login-cancelled',
      () => {
        setIsLoggingIn(false);
      },
    );

    const unsubscribeLogout = window.electron?.ipcRenderer.on(
      'logout-successful',
      () => {
        setIsAuthenticated(false);
      },
    );

    return () => {
      isMounted = false;
      unsubscribeLoginSuccess?.();
      unsubscribeLoginCancelled?.();
      unsubscribeLogout?.();
    };
  }, []);

  if (isAuthLoading) {
    return <div>Checking authentication...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Home
                onLogout={() => {
                  window.electron?.ipcRenderer.sendMessage('logout-requested');
                }}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <LoginPage
                isLoggingIn={isLoggingIn}
                onLogin={() => {
                  setIsLoggingIn(true);
                  window.electron?.ipcRenderer.sendMessage('open-login-window');
                }}
              />
            )
          }
        />
      </Routes>
    </Router>
  );
}
