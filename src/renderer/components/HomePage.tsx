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
import DetailView from './DetailView';
import Dashboard from './Dashboard';
import FileTree from './FileTree';
import { AssignmentTreeItem, CourseTreeItem } from './types';

type SelectedView =
  | { type: 'dashboard' }
  | { type: 'course'; course: CourseTreeItem }
  | { type: 'assignment'; assignment: AssignmentTreeItem };

export default function Home({ onLogout }: { onLogout: () => void }) {
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [selectedView, setSelectedView] = useState<SelectedView>({
    type: 'dashboard',
  });

  const handleSelectCourse = (course: CourseTreeItem | null) => {
    if (course) {
      setSelectedView({ type: 'course', course });
      return;
    }

    setSelectedView({ type: 'dashboard' });
  };

  const handleSelectAssignment = (assignment: AssignmentTreeItem | null) => {
    if (assignment) {
      setSelectedView({ type: 'assignment', assignment });
      return;
    }

    setSelectedView({ type: 'dashboard' });
  };

  const handleSelectDashboard = () => {
    setSelectedView({ type: 'dashboard' });
  };

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
          <FileTree
            onSelectCourse={handleSelectCourse}
            onSelectAssignment={handleSelectAssignment}
            onSelectDashboard={handleSelectDashboard}
          />
        </div>
        <div className={styles.detail}>
          {selectedView.type === 'dashboard' ? (
            <Dashboard />
          ) : (
            <DetailView
              course={
                selectedView.type === 'course' ? selectedView.course : null
              }
              assignment={
                selectedView.type === 'assignment'
                  ? selectedView.assignment
                  : null
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
