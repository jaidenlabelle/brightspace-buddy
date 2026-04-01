import { type ReactElement } from 'react';
import { Button, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import {
  AssignmentTreeItem,
  ContentModule,
  ContentModuleItem,
  ContentNode,
  CourseTreeItem,
  EntityDropboxStatus,
} from './types';

function getStatusLabel(status: EntityDropboxStatus): string {
  switch (status) {
    case EntityDropboxStatus.Unsubmitted:
      return 'Unsubmitted';
    case EntityDropboxStatus.Submitted:
      return 'Submitted';
    case EntityDropboxStatus.Draft:
      return 'Draft';
    case EntityDropboxStatus.Published:
      return 'Grade Published';
    default:
      return 'Unknown';
  }
}

export default function DetailView({
  course,
  assignment,
  contentModule,
  contentItem,
}: {
  course: CourseTreeItem | null;
  assignment: AssignmentTreeItem | null;
  contentModule: ContentModule | null;
  contentItem: ContentModuleItem | null;
}) {
  const endsAt = course ? new Date(course.ends_at).toLocaleDateString() : null;
  const startsAt = assignment?.starts_at
    ? new Date(assignment.starts_at).toLocaleDateString()
    : null;
  const assignmentEndsAt = assignment?.ends_at
    ? new Date(assignment.ends_at).toLocaleDateString()
    : null;
  const dueAt = assignment?.due_at
    ? new Date(assignment.due_at).toLocaleDateString()
    : null;
  const gradePoints = assignment?.grade?.points;
  const gradeDisplay = gradePoints
    ? (() => {
        const { numerator, denominator } = gradePoints;
        const fraction = `${numerator}/${denominator}`;

        if (denominator <= 0) {
          return fraction;
        }

        const percent = (numerator / denominator) * 100;
        const formattedPercent = Number.isInteger(percent)
          ? percent.toString()
          : percent.toFixed(1);

        return `${fraction} (${formattedPercent}%)`;
      })()
    : null;

  const contentItemDetails = contentItem
    ? {
        title: contentItem.Title,
        url: contentItem.Url,
      }
    : null;

  const renderDownloadButton = (url: string, label = 'Download file') => (
    <Button
      variant="contained"
      color="primary"
      disabled={!url}
      sx={{ alignSelf: 'flex-start' }}
      onClick={() => {
        if (!url) {
          return;
        }

        window.electron.ipcRenderer.sendMessage('download-content-item', url);
      }}
    >
      {url ? label : 'Download unavailable'}
    </Button>
  );

  const renderContentNodes = (
    nodes: ContentNode[],
    depth = 0,
  ): ReactElement[] => {
    return nodes.map((node) => {
      const indent = `${depth * 16}px`;

      if (node.kind === 'file') {
        return (
          <Paper
            key={`${node.kind}-${node.Id}`}
            variant="outlined"
            sx={{ p: 1.25, bgcolor: 'background.default', ml: indent }}
          >
            <Stack spacing={0.75}>
              <Typography variant="subtitle1" fontWeight={600}>
                {node.Title}
              </Typography>
              {renderDownloadButton(node.Url)}
            </Stack>
          </Paper>
        );
      }

      return (
        <Paper
          key={`${node.kind}-${node.Id}`}
          variant="outlined"
          sx={{ p: 1.25, bgcolor: 'background.default', ml: indent }}
        >
          <Stack spacing={0.75}>
            <Typography variant="subtitle1" fontWeight={600}>
              {node.Title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {node.Children.length} item{node.Children.length === 1 ? '' : 's'}
            </Typography>
            {node.Children.length > 0 ? (
              <Stack spacing={1}>
                {renderContentNodes(node.Children, depth + 1)}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No items found in this section.
              </Typography>
            )}
          </Stack>
        </Paper>
      );
    });
  };

  let detailContent = (
    <Typography variant="body1" color="text.secondary">
      Select a course, assignment, or content item to see details.
    </Typography>
  );

  if (assignment) {
    detailContent = (
      <Stack spacing={1.5}>
        <Typography variant="h5" fontWeight={700}>
          {assignment.name}
        </Typography>
        <Divider />
        <Typography variant="body1">
          Starts At: {startsAt ?? 'No start date available'}
        </Typography>
        <Typography variant="body1">
          Ends At: {assignmentEndsAt ?? 'No end date available'}
        </Typography>
        <Typography variant="body1">
          Due At: {dueAt ?? 'No due date available'}
        </Typography>
        <Typography variant="body1">
          Grade: {gradeDisplay ?? 'No grade available'}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body1">Status:</Typography>
          <Chip label={getStatusLabel(assignment.status)} color="secondary" />
        </Stack>
      </Stack>
    );
  } else if (contentItemDetails) {
    detailContent = (
      <Stack spacing={1.5}>
        <Typography variant="h5" fontWeight={700}>
          {contentItemDetails.title}
        </Typography>
        <Divider />
        {renderDownloadButton(contentItemDetails.url)}
      </Stack>
    );
  } else if (contentModule) {
    detailContent = (
      <Stack spacing={1.5}>
        <Typography variant="h5" fontWeight={700}>
          {contentModule.Title}
        </Typography>
        <Divider />
        <Typography variant="body1">
          Items: {contentModule.Children.length}
        </Typography>
        {contentModule.Children.length > 0 ? (
          <Stack spacing={1}>
            {renderContentNodes(contentModule.Children)}
          </Stack>
        ) : (
          <Typography variant="body1" color="text.secondary">
            No items found in this content section.
          </Typography>
        )}
      </Stack>
    );
  } else if (course) {
    detailContent = (
      <Stack spacing={1.5}>
        <Typography variant="h5" fontWeight={700}>
          {course.name}
        </Typography>
        <Divider />
        <Typography variant="body1">Full Code: {course.full_code}</Typography>
        <Typography variant="body1">
          Section: {course.section_number ?? 'No section available'}
        </Typography>
        <Typography variant="body1">
          Semester: {course.semester.year} {course.semester.term}
        </Typography>
        <Typography variant="body1">Ends At: {endsAt}</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body1">Status:</Typography>
          <Chip
            label={course.is_active ? 'Active' : 'Inactive'}
            color={course.is_active ? 'primary' : 'default'}
          />
        </Stack>
      </Stack>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, md: 2.5 },
        height: '100%',
        bgcolor: 'background.paper',
      }}
    >
      {detailContent}
    </Paper>
  );
}
