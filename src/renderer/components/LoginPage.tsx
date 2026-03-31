import Button from '@mui/material/Button';
import { useEffect, useState } from 'react';
import styles from '../LoginPage.module.scss';

export default function LoginPage() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    // Subscribe once and remove listener on unmount.
    const unsubscribe = window.electron?.ipcRenderer.on(
      'login-successful',
      () => {
        setIsLoggingIn(false);
      },
    );

    return () => {
      unsubscribe?.();
    };
  }, []);

  return (
    <div className={styles.login}>
      <div className={styles.header}>
        <h1>Brightspace Buddy</h1>
        <p>Welcome to Brightspace Buddy!</p>
      </div>
      <div className={styles.content}>
        <p>To get started, please log in with your Brightspace credentials.</p>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            setIsLoggingIn(true);
            window.electron?.ipcRenderer.sendMessage('open-login-window');
          }}
          loading={isLoggingIn}
        >
          Log In with Brightspace
        </Button>
      </div>
    </div>
  );
}
