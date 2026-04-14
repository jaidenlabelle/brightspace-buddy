import { type ReactElement, useEffect, useState } from 'react';
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

function getStatusColor(
  status: EntityDropboxStatus,
): 'error' | 'warning' | 'success' | 'default' {
  switch (status) {
    case EntityDropboxStatus.Unsubmitted:
      return 'error';
    case EntityDropboxStatus.Draft:
      return 'warning';
    case EntityDropboxStatus.Submitted:
    case EntityDropboxStatus.Published:
      return 'success';
    default:
      return 'default';
  }
}

function percentageToLetter(percent: number | null): string {
  if (percent === null || Number.isNaN(percent)) {
    return 'N/A';
  }

  if (percent >= 90) return 'A+';
  if (percent >= 85) return 'A';
  if (percent >= 80) return 'A-';
  if (percent >= 77) return 'B+';
  if (percent >= 73) return 'B';
  if (percent >= 70) return 'B-';
  if (percent >= 67) return 'C+';
  if (percent >= 63) return 'C';
  if (percent >= 60) return 'C-';
  if (percent >= 57) return 'D+';
  if (percent >= 53) return 'D';
  if (percent >= 50) return 'D-';
  return 'F';
}

function percentageToGpa(percent: number | null): number | null {
  if (percent === null || Number.isNaN(percent)) {
    return null;
  }

  if (percent >= 90) return 4.0;
  if (percent >= 85) return 3.8;
  if (percent >= 80) return 3.6;
  if (percent >= 77) return 3.3;
  if (percent >= 73) return 3.0;
  if (percent >= 70) return 2.7;
  if (percent >= 67) return 2.3;
  if (percent >= 63) return 2.0;
  if (percent >= 60) return 1.7;
  if (percent >= 57) return 1.4;
  if (percent >= 53) return 1.2;
  if (percent >= 50) return 1.0;
  return 0.0;
}

function getDueLabel(dueDate: string | Date | null): string {
  if (!dueDate) {
    return 'No due date';
  }

  const dueMs = new Date(dueDate).getTime();
  const nowMs = Date.now();
  const days = Math.ceil((dueMs - nowMs) / (1000 * 60 * 60 * 24));

  if (days < 0) {
    const overdueDays = Math.abs(days);
    return `Overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}`;
  }

  if (days === 0) {
    return 'Due today';
  }

  return `Due in ${days} day${days === 1 ? '' : 's'}`;
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
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

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
  const gradePercent =
    gradePoints && gradePoints.denominator > 0
      ? (gradePoints.numerator / gradePoints.denominator) * 100
      : null;
  const gradeLetter = percentageToLetter(gradePercent);
  const gradeGpa = percentageToGpa(gradePercent);
  const gradeWorth = assignment?.grade?.weight?.denominator ?? null;
  const gradeDisplay = gradePoints
    ? `${gradePoints.numerator}/${gradePoints.denominator}`
    : null;

  const contentItemDetails = contentItem
    ? {
        title: contentItem.Title,
        url: contentItem.Url,
      }
    : null;

  useEffect(() => {
    setSummary(null);
    setSummaryError(null);
    setIsSummarizing(false);
  }, [contentItemDetails?.url, contentModule?.Id]);

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

  const renderSummarizeButton = (url: string, title: string) => (
    <Button
      variant="outlined"
      color="secondary"
      disabled={!url || isSummarizing}
      sx={{ alignSelf: 'flex-start' }}
      onClick={async () => {
        if (!url) {
          return;
        }

        setIsSummarizing(true);
        setSummary(null);
        setSummaryError(null);

        try {
          const result = (await window.electron.ipcRenderer.invoke(
            'summarize-content-item',
            url,
            title,
          )) as string;
          setSummary(result);
        } catch (error) {
          setSummaryError(
            error instanceof Error
              ? error.message
              : 'Failed to summarize file.',
          );
        } finally {
          setIsSummarizing(false);
        }
      }}
    >
      {isSummarizing ? 'Summarizing...' : 'Summarize with AI'}
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
      <Stack spacing={2}>
        <Stack spacing={0.75}>
          <Typography variant="h5" fontWeight={700}>
            {assignment.name}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip
              label={getStatusLabel(assignment.status)}
              color={getStatusColor(assignment.status)}
            />
            <Chip label={getDueLabel(assignment.due_at)} variant="outlined" />
          </Stack>
        </Stack>

        <Divider />

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
          <Paper variant="outlined" sx={{ p: 1.25, flex: 1 }}>
            <Stack spacing={0.25}>
              <Typography variant="caption" color="text.secondary">
                Starts
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {startsAt ?? 'No start date available'}
              </Typography>
            </Stack>
          </Paper>
          <Paper variant="outlined" sx={{ p: 1.25, flex: 1 }}>
            <Stack spacing={0.25}>
              <Typography variant="caption" color="text.secondary">
                Due
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {dueAt ?? 'No due date available'}
              </Typography>
            </Stack>
          </Paper>
          <Paper variant="outlined" sx={{ p: 1.25, flex: 1 }}>
            <Stack spacing={0.25}>
              <Typography variant="caption" color="text.secondary">
                Ends
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {assignmentEndsAt ?? 'No end date available'}
              </Typography>
            </Stack>
          </Paper>
        </Stack>

        <Paper
          variant="outlined"
          sx={{ p: 1.5, bgcolor: 'background.default' }}
        >
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" fontWeight={700}>
              Grade details
            </Typography>
            <Divider />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
              <Paper variant="outlined" sx={{ p: 1.25, flex: 1 }}>
                <Stack spacing={0.25}>
                  <Typography variant="caption" color="text.secondary">
                    Grade item
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {assignment.grade?.name ?? assignment.name}
                  </Typography>
                </Stack>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.25, flex: 1 }}>
                <Stack spacing={0.25}>
                  <Typography variant="caption" color="text.secondary">
                    Marks
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {gradeDisplay ?? 'No grade available'}
                  </Typography>
                </Stack>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.25, flex: 1 }}>
                <Stack spacing={0.25}>
                  <Typography variant="caption" color="text.secondary">
                    Worth
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {gradeWorth === null ? 'N/A' : `${gradeWorth}%`}
                  </Typography>
                </Stack>
              </Paper>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                size="small"
                label={
                  gradePercent === null
                    ? 'Percent: N/A'
                    : `Percent: ${gradePercent.toFixed(1)}%`
                }
                variant="outlined"
              />
              <Chip
                size="small"
                label={`Letter: ${gradeLetter}`}
                variant="outlined"
              />
              <Chip
                size="small"
                label={
                  gradeGpa === null
                    ? 'AA14 GPA: N/A'
                    : `AA14 GPA: ${gradeGpa.toFixed(1)}`
                }
                variant="outlined"
              />
            </Stack>

            {assignment.grade?.comments ? (
              <Paper
                variant="outlined"
                sx={{ p: 1.25, bgcolor: 'background.paper' }}
              >
                <Stack spacing={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    Feedback
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {assignment.grade.comments}
                  </Typography>
                </Stack>
              </Paper>
            ) : null}
          </Stack>
        </Paper>

        {assignment.description ? (
          <Paper
            variant="outlined"
            sx={{ p: 1.5, bgcolor: 'background.default' }}
          >
            <Stack spacing={1}>
              <Typography variant="subtitle1" fontWeight={700}>
                Description
              </Typography>
              <Divider />
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {assignment.description}
              </Typography>
            </Stack>
          </Paper>
        ) : null}

        {assignment.fileAttachments && assignment.fileAttachments.length > 0 ? (
          <Paper
            variant="outlined"
            sx={{ p: 1.5, bgcolor: 'background.default' }}
          >
            <Stack spacing={1}>
              <Typography variant="subtitle1" fontWeight={700}>
                File Attachments
              </Typography>
              <Divider />
              <Stack spacing={1}>
                {assignment.fileAttachments.map((file) => (
                  <Paper
                    key={file.FileId}
                    variant="outlined"
                    sx={{ p: 1.25, bgcolor: 'background.paper' }}
                  >
                    <Stack spacing={0.5}>
                      <Typography variant="body2" fontWeight={600}>
                        {file.FileName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(file.Size / 1024).toFixed(2)} KB
                      </Typography>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Stack>
          </Paper>
        ) : null}

        {assignment.linkAttachments && assignment.linkAttachments.length > 0 ? (
          <Paper
            variant="outlined"
            sx={{ p: 1.5, bgcolor: 'background.default' }}
          >
            <Stack spacing={1}>
              <Typography variant="subtitle1" fontWeight={700}>
                Link Attachments
              </Typography>
              <Divider />
              <Stack spacing={1}>
                {assignment.linkAttachments.map((link) => (
                  <Paper
                    key={link.LinkId}
                    variant="outlined"
                    sx={{ p: 1.25, bgcolor: 'background.paper' }}
                  >
                    <Stack spacing={0.5}>
                      <Button
                        component="a"
                        href={link.Href}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ textAlign: 'left', justifyContent: 'flex-start' }}
                      >
                        {link.LinkName}
                      </Button>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 1 }}
                      >
                        {link.Href}
                      </Typography>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Stack>
          </Paper>
        ) : null}
      </Stack>
    );
  } else if (contentItemDetails) {
    detailContent = (
      <Stack spacing={1.5}>
        <Typography variant="h5" fontWeight={700}>
          {contentItemDetails.title}
        </Typography>
        <Divider />
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {renderDownloadButton(contentItemDetails.url)}
          {renderSummarizeButton(
            contentItemDetails.url,
            contentItemDetails.title,
          )}
        </Stack>
        {summaryError ? (
          <Typography variant="body2" color="error">
            {summaryError}
          </Typography>
        ) : null}
        {summary ? (
          <Paper
            variant="outlined"
            sx={{ p: 1.5, bgcolor: 'background.default' }}
          >
            <Stack spacing={0.75}>
              <Typography variant="subtitle2" fontWeight={700}>
                AI Summary
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {summary}
              </Typography>
            </Stack>
          </Paper>
        ) : null}
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
