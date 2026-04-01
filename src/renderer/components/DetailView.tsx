import { Chip, Divider, Link, Paper, Stack, Typography } from '@mui/material';
import {
  AssignmentTreeItem,
  ContentModule,
  ContentModuleItem,
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

  const contentItems = contentModule?.Structure ?? [];

  const contentItemDetails = contentItem
    ? {
        title: contentItem.Title,
        url: contentItem.Url,
      }
    : null;

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
        <Typography variant="body1">
          URL:{' '}
          <Link href={contentItemDetails.url} target="_blank" rel="noreferrer">
            Open content item
          </Link>
        </Typography>
      </Stack>
    );
  } else if (contentModule) {
    detailContent = (
      <Stack spacing={1.5}>
        <Typography variant="h5" fontWeight={700}>
          {contentModule.Title}
        </Typography>
        <Divider />
        <Typography variant="body1">Items: {contentItems.length}</Typography>
        {contentItems.length > 0 ? (
          <Stack spacing={1}>
            {contentItems.map((item) => (
              <Paper
                key={item.Id}
                variant="outlined"
                sx={{ p: 1.25, bgcolor: 'background.default' }}
              >
                <Stack spacing={0.5}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {item.Title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.Url}
                  </Typography>
                </Stack>
              </Paper>
            ))}
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
