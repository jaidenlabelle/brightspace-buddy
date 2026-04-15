import { useEffect, useState } from 'react';
import {
  Box,
  DialogActions,
  DialogContentText,
  DialogTitle,
  Button,
  DialogContent,
  Dialog,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import UserProfile from './UserProfile';
import DetailView from './DetailView';
import Dashboard from './Dashboard';
import GpaCalculator from './GpaCalculator';
import FileTree from './FileTree';
import {
  AssignmentTreeItem,
  ContentModule,
  ContentModuleItem,
  CourseTreeItem,
} from './types';

type SelectedView =
  | { type: 'dashboard' }
  | { type: 'gpa-calculator' }
  | { type: 'course'; course: CourseTreeItem }
  | { type: 'assignment'; assignment: AssignmentTreeItem }
  | { type: 'content-module'; contentModule: ContentModule }
  | { type: 'content-item'; contentItem: ContentModuleItem };

export default function Home({ onLogout }: { onLogout: () => void }) {
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [unsubscribeDialogOpen, setUnsubscribeDialogOpen] = useState(false);
  const [isSubscriptionActive, setIsSubscriptionActive] = useState(false);
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

  const handleSelectContentModule = (contentModule: ContentModule | null) => {
    if (contentModule) {
      setSelectedView({ type: 'content-module', contentModule });
      return;
    }

    setSelectedView({ type: 'dashboard' });
  };

  const handleSelectContentItem = (contentItem: ContentModuleItem | null) => {
    if (contentItem) {
      setSelectedView({ type: 'content-item', contentItem });
      return;
    }

    setSelectedView({ type: 'dashboard' });
  };

  const handleSelectDashboard = () => {
    setSelectedView({ type: 'dashboard' });
  };

  const handleSelectGpaCalculator = () => {
    if (!isSubscriptionActive) {
      handleOpenPurchaseDialog();
      setSelectedView({ type: 'dashboard' });
      return;
    }

    setSelectedView({ type: 'gpa-calculator' });
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

  const handleSubscriptionButtonClick = () => {
    if (isSubscriptionActive) {
      setUnsubscribeDialogOpen(true);
      return;
    }

    setPurchaseDialogOpen(true);
  };

  const handleOpenPurchaseDialog = () => {
    setPurchaseDialogOpen(true);
  };

  const handleActivateSubscription = () => {
    setIsSubscriptionActive(true);
    setPurchaseDialogOpen(false);
  };

  const handleUnsubscribe = () => {
    setIsSubscriptionActive(false);
    setUnsubscribeDialogOpen(false);
  };

  useEffect(() => {
    if (!isSubscriptionActive && selectedView.type === 'gpa-calculator') {
      setSelectedView({ type: 'dashboard' });
    }
  }, [isSubscriptionActive, selectedView.type]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        px: { xs: 2, md: 3 },
        py: { xs: 2, md: 2.5 },
        background:
          'linear-gradient(155deg, rgba(244,240,230,1) 0%, rgba(237,229,214,1) 100%)',
      }}
    >
      <UserProfile
        name="Jaiden Labelle"
        onAvatarClick={handleLogoutDialogOpen}
        isSubscribed={isSubscriptionActive}
        onSubscriptionClick={handleSubscriptionButtonClick}
      />
      <Dialog open={logoutDialogOpen} onClose={handleLogoutDialogClose}>
        <DialogTitle>Log Out</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to log out?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleLogoutDialogClose}>Cancel</Button>
          <Button onClick={handleLogout} variant="contained" color="primary">
            Log Out
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={purchaseDialogOpen}
        onClose={() => {
          setPurchaseDialogOpen(false);
        }}
      >
        <DialogTitle>Brightspace Buddy Pro</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Unlock AI summaries and assistant tools with a paid subscription.
            This is a demo checkout, so no payment will be collected.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setPurchaseDialogOpen(false);
            }}
          >
            Not now
          </Button>
          <Button
            onClick={handleActivateSubscription}
            variant="contained"
            color="secondary"
          >
            Activate Demo Subscription
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={unsubscribeDialogOpen}
        onClose={() => {
          setUnsubscribeDialogOpen(false);
        }}
      >
        <DialogTitle>Manage Subscription</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Your subscription is currently active. Would you like to unsubscribe?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setUnsubscribeDialogOpen(false);
            }}
          >
            Keep Subscription
          </Button>
          <Button onClick={handleUnsubscribe} variant="contained" color="error">
            Unsubscribe
          </Button>
        </DialogActions>
      </Dialog>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems="stretch"
      >
        <Paper
          elevation={2}
          sx={{
            width: { xs: '100%', md: 360 },
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            Explorer
          </Typography>
          <FileTree
            onSelectCourse={handleSelectCourse}
            onSelectAssignment={handleSelectAssignment}
            onSelectContentModule={handleSelectContentModule}
            onSelectContentItem={handleSelectContentItem}
            onSelectDashboard={handleSelectDashboard}
            onSelectGpaCalculator={handleSelectGpaCalculator}
            isSubscriptionActive={isSubscriptionActive}
            onRequireSubscription={handleOpenPurchaseDialog}
          />
        </Paper>
        <Paper
          elevation={1}
          sx={{
            flex: 1,
            p: { xs: 2, md: 2.5 },
            border: '1px solid',
            borderColor: 'divider',
            minHeight: { md: 'calc(100vh - 120px)' },
          }}
        >
          <Box
            sx={{
              display: selectedView.type === 'dashboard' ? 'block' : 'none',
              height: '100%',
            }}
          >
            <Dashboard
              onSelectAssignment={(assignment) => {
                setSelectedView({ type: 'assignment', assignment });
              }}
            />
          </Box>
          <Box
            sx={{
              display:
                selectedView.type === 'gpa-calculator' ? 'block' : 'none',
              height: '100%',
            }}
          >
            <GpaCalculator />
          </Box>
          <Box
            sx={{
              display:
                selectedView.type === 'dashboard' ||
                selectedView.type === 'gpa-calculator'
                  ? 'none'
                  : 'block',
              height: '100%',
            }}
          >
            <DetailView
              isSubscriptionActive={isSubscriptionActive}
              onRequireSubscription={handleOpenPurchaseDialog}
              course={
                selectedView.type === 'course' ? selectedView.course : null
              }
              assignment={
                selectedView.type === 'assignment'
                  ? selectedView.assignment
                  : null
              }
              contentModule={
                selectedView.type === 'content-module'
                  ? selectedView.contentModule
                  : null
              }
              contentItem={
                selectedView.type === 'content-item'
                  ? selectedView.contentItem
                  : null
              }
            />
          </Box>
        </Paper>
      </Stack>
    </Box>
  );
}
