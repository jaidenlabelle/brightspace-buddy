import Button from '@mui/material/Button';
import styles from '../styles/LoginPage.module.scss';

type LoginPageProps = {
  isLoggingIn: boolean;
  onLogin: () => void;
};

export default function LoginPage({ isLoggingIn, onLogin }: LoginPageProps) {
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
          onClick={onLogin}
          loading={isLoggingIn}
        >
          Log In with Brightspace
        </Button>
      </div>
    </div>
  );
}
