import { Paper, Stack, Typography } from '@mui/material';

export default function Dashboard() {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
      <Stack spacing={1.5}>
        <Typography variant="h4" fontWeight={700}>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome to Brightspace Buddy! Please select a course from the left to
          view details.
        </Typography>
      </Stack>
    </Paper>
  );
}
