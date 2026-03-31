import { useState } from 'react';
import {
  DialogActions,
  DialogTitle,
  Button,
  DialogContent,
  Dialog,
} from '@mui/material';
import styles from '../styles/HomePage.module.scss';
import UserProfile from './UserProfile';
import FileTree from './FileTree';

export default function Home({ onLogout }: { onLogout: () => void }) {
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const handleLogoutDialogOpen = () => {
    setLogoutDialogOpen(true);
  };

  const handleLogoutDialogClose = () => {
    setLogoutDialogOpen(false);
  };

  const handleLogout = () => {
    onLogout();
    setLogoutDialogOpen(false);
  };

  return (
    <div className={styles.home}>
      <UserProfile name="Jaiden Labelle" onClick={handleLogoutDialogOpen} />
      <Dialog open={logoutDialogOpen} onClose={handleLogoutDialogClose}>
        <DialogTitle>Log Out</DialogTitle>
        <DialogContent>
          <p>Are you sure you want to log out?</p>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleLogoutDialogClose}>Cancel</Button>
          <Button onClick={handleLogout} variant="contained" color="primary">
            Log Out
          </Button>
        </DialogActions>
      </Dialog>
      <div className="divider" />
      <div className={styles.masterDetail}>
        <div className={styles.master}>
          <h2>Explorer</h2>
          <FileTree />
        </div>
        <div className={styles.detail}>
          <h2>Welcome to Brightspace Buddy!</h2>
          <p>
            This is your dashboard where you can access all your course
            materials and assignments in one place.
          </p>
        </div>
      </div>
    </div>
  );
}
