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
  isSubscriptionActive,
  onRequireSubscription,
  course,
  assignment,
  contentModule,
  contentItem,
}: {
  isSubscriptionActive: boolean;
  onRequireSubscription: () => void;
  course: CourseTreeItem | null;
  assignment: AssignmentTreeItem | null;
  contentModule: ContentModule | null;
  contentItem: ContentModuleItem | null;
}) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [attachmentSummaries, setAttachmentSummaries] = useState<
    Record<string, { summary: string; loading: boolean; error: string | null }>
  >({});
  const [attachmentDownloads, setAttachmentDownloads] = useState<
    Record<
      string,
      { loading: boolean; error: string | null; path: string | null }
    >
  >({});
  const [assignmentSummary, setAssignmentSummary] = useState<string | null>(
    null,
  );
  const [isSummarizingAssignment, setIsSummarizingAssignment] = useState(false);
  const [assignmentSummaryError, setAssignmentSummaryError] = useState<
    string | null
  >(null);
  const [courseDescription, setCourseDescription] = useState<string | null>(null);
  const [courseInstructors, setCourseInstructors] = useState<any[]>([]);
  const [isLoadingCourseDetails, setIsLoadingCourseDetails] = useState(false);

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
    setAttachmentSummaries({});
    setAttachmentDownloads({});
    setAssignmentSummary(null);
    setAssignmentSummaryError(null);
    setIsSummarizingAssignment(false);
  }, [contentItemDetails?.url, contentModule?.Id, assignment?.name]);

  useEffect(() => {
    let cancelled = false;

    if (!contentItemDetails?.url) {
      return () => {
        cancelled = true;
      };
    }

    const loadCachedContentSummary = async () => {
      try {
        const cachedSummary = (await window.electron.ipcRenderer.invoke(
          'get-cached-content-summary',
          contentItemDetails.url,
          contentItemDetails.title,
        )) as string | null;

        if (!cancelled && cachedSummary) {
          setSummary(cachedSummary);
        }
      } catch {
        // Ignore cache preload failures and allow manual summarization.
      }
    };

    loadCachedContentSummary();

    return () => {
      cancelled = true;
    };
  }, [contentItemDetails?.title, contentItemDetails?.url]);

  useEffect(() => {
    let cancelled = false;

    if (!assignment) {
      return () => {
        cancelled = true;
      };
    }

    const loadCachedAssignmentSummaries = async () => {
      try {
        const attachmentLookupPayload = assignment.fileAttachments
          .filter((file) => Boolean(file.Url))
          .map((file) => ({
            fileName: file.FileName,
            url: file.Url as string,
          }));

        const cachedData = (await window.electron.ipcRenderer.invoke(
          'get-cached-assignment-summaries',
          assignment.name,
          assignment.description,
          attachmentLookupPayload,
        )) as {
          attachmentSummaries: Array<{ fileName: string; summary: string }>;
          assignmentSummary: string | null;
        };

        if (cancelled) {
          return;
        }

        if (cachedData.attachmentSummaries.length > 0) {
          setAttachmentSummaries((prev) => {
            const next = { ...prev };

            cachedData.attachmentSummaries.forEach((entry) => {
              next[entry.fileName] = {
                summary: entry.summary,
                loading: false,
                error: null,
              };
            });

            return next;
          });
        }

        if (cachedData.assignmentSummary) {
          setAssignmentSummary(cachedData.assignmentSummary);
        }
      } catch {
        // Ignore cache preload failures and allow manual summarization.
      }
    };

    loadCachedAssignmentSummaries();

    return () => {
      cancelled = true;
    };
  }, [assignment]);

  useEffect(() => {
    if (!course) {
      setCourseDescription(null);
      setCourseInstructors([]);
      return () => {
        // noop
      };
    }

    let cancelled = false;
    setIsLoadingCourseDetails(true);

    const loadCourseDetails = async () => {
      try {
        const [description, instructors] = await Promise.all([
          window.electron.ipcRenderer.invoke(
            'get-course-description',
            course.org_unit_id,
          ) as Promise<string | null>,
          window.electron.ipcRenderer.invoke(
            'get-course-instructors',
            course.org_unit_id,
          ) as Promise<any[]>,
        ]);

        if (!cancelled) {
          setCourseDescription(description);
          setCourseInstructors(instructors || []);
        }
      } catch {
        // Ignore failures
      } finally {
        if (!cancelled) {
          setIsLoadingCourseDetails(false);
        }
      }
    };

    loadCourseDetails();

    return () => {
      cancelled = true;
    };
  }, [course]);

  const renderDownloadButton = (
    url: string,
    label?: string,
    fileName?: string,
  ) => (
    <Button
      variant="contained"
      color="primary"
      disabled={!url}
      sx={{ alignSelf: 'flex-start' }}
      onClick={() => {
        if (!url) {
          return;
        }

        window.electron.ipcRenderer.sendMessage(
          'download-content-item',
          url,
          fileName || label || 'content-file',
        );
      }}
    >
      {url ? label || 'Download file' : 'Download unavailable'}
    </Button>
  );

  const renderSummarizeButton = (url: string, title: string) => (
    <Button
      variant="outlined"
      color="secondary"
      disabled={!url || isSummarizing}
      sx={{
        alignSelf: 'flex-start',
        opacity: isSubscriptionActive ? 1 : 0.55,
        filter: isSubscriptionActive ? 'none' : 'grayscale(0.9)',
      }}
      onClick={async () => {
        if (!url) {
          return;
        }

        if (!isSubscriptionActive) {
          onRequireSubscription();
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

  const handleDownloadAttachment = async (url: string, fileName: string) => {
    if (!assignment) {
      return;
    }

    const downloadKey = fileName;
    setAttachmentDownloads((prev) => ({
      ...prev,
      [downloadKey]: {
        loading: true,
        error: null,
        path: prev[downloadKey]?.path ?? null,
      },
    }));

    try {
      const result = (await window.electron.ipcRenderer.invoke(
        'download-file-attachment',
        url,
        fileName,
        assignment.name,
      )) as { success: boolean; path?: string };

      setAttachmentDownloads((prev) => ({
        ...prev,
        [downloadKey]: {
          loading: false,
          error: null,
          path: result.path ?? prev[downloadKey]?.path ?? null,
        },
      }));
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : 'Failed to download attachment';
      setAttachmentDownloads((prev) => ({
        ...prev,
        [downloadKey]: {
          loading: false,
          error: errorMsg,
          path: prev[downloadKey]?.path ?? null,
        },
      }));
    }
  };

  const handleSummarizeAttachment = async (url: string, fileName: string) => {
    if (!assignment) return;

    const summaryKey = fileName;
    setAttachmentSummaries((prev) => ({
      ...prev,
      [summaryKey]: { summary: '', loading: true, error: null },
    }));

    try {
      const result = (await window.electron.ipcRenderer.invoke(
        'summarize-file-attachment',
        url,
        fileName,
        assignment.name,
      )) as string;

      setAttachmentSummaries((prev) => ({
        ...prev,
        [summaryKey]: { summary: result, loading: false, error: null },
      }));
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Failed to summarize file';
      setAttachmentSummaries((prev) => ({
        ...prev,
        [summaryKey]: { summary: '', loading: false, error: errorMsg },
      }));
    }
  };

  const handleSummarizeAssignment = async () => {
    if (!assignment) return;

    setIsSummarizingAssignment(true);
    setAssignmentSummaryError(null);
    setAssignmentSummary(null);

    try {
      const summarizedAttachments = await Promise.all(
        assignment.fileAttachments.map(async (file) => {
          if (!file.Url) {
            setAttachmentSummaries((prev) => ({
              ...prev,
              [file.FileName]: {
                summary: prev[file.FileName]?.summary ?? '',
                loading: false,
                error: 'Attachment URL unavailable for this file.',
              },
            }));
            return null;
          }

          setAttachmentSummaries((prev) => ({
            ...prev,
            [file.FileName]: {
              summary: prev[file.FileName]?.summary ?? '',
              loading: true,
              error: null,
            },
          }));

          try {
            const attachmentSummary = (await window.electron.ipcRenderer.invoke(
              'summarize-file-attachment',
              file.Url,
              file.FileName,
              assignment.name,
            )) as string;

            setAttachmentSummaries((prev) => ({
              ...prev,
              [file.FileName]: {
                summary: attachmentSummary,
                loading: false,
                error: null,
              },
            }));

            return { fileName: file.FileName, summary: attachmentSummary };
          } catch (error) {
            const errorMsg =
              error instanceof Error
                ? error.message
                : 'Failed to summarize file';
            setAttachmentSummaries((prev) => ({
              ...prev,
              [file.FileName]: {
                summary: prev[file.FileName]?.summary ?? '',
                loading: false,
                error: errorMsg,
              },
            }));

            return null;
          }
        }),
      );

      const summaries = summarizedAttachments.filter(
        (item): item is { fileName: string; summary: string } => item !== null,
      );

      const result = (await window.electron.ipcRenderer.invoke(
        'summarize-assignment-full',
        assignment.name,
        assignment.description,
        summaries,
      )) as string;

      setAssignmentSummary(result);
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : 'Failed to summarize assignment';
      setAssignmentSummaryError(errorMsg);
    } finally {
      setIsSummarizingAssignment(false);
    }
  };

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
              {renderDownloadButton(node.Url, undefined, node.Title)}
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
                {assignment.fileAttachments.map((file) => {
                  const summaryData = attachmentSummaries[file.FileName];
                  const downloadData = attachmentDownloads[file.FileName];
                  const hasAttachmentUrl = Boolean(file.Url);
                  return (
                    <Paper
                      key={file.FileId}
                      variant="outlined"
                      sx={{ p: 1.25, bgcolor: 'background.paper' }}
                    >
                      <Stack spacing={0.75}>
                        <Stack spacing={0.5}>
                          <Typography variant="body2" fontWeight={600}>
                            {file.FileName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {(file.Size / 1024).toFixed(2)} KB
                          </Typography>
                        </Stack>
                        <Stack
                          direction="row"
                          spacing={0.75}
                          flexWrap="wrap"
                          sx={{ pt: 0.5 }}
                        >
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={
                              downloadData?.loading || !hasAttachmentUrl
                            }
                            onClick={() => {
                              if (!file.Url) {
                                return;
                              }

                              handleDownloadAttachment(file.Url, file.FileName);
                            }}
                          >
                            {downloadData?.loading
                              ? 'Downloading...'
                              : 'Download'}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="secondary"
                            disabled={
                              summaryData?.loading ||
                              isSummarizingAssignment ||
                              !hasAttachmentUrl
                            }
                            sx={{
                              opacity: isSubscriptionActive ? 1 : 0.55,
                              filter: isSubscriptionActive
                                ? 'none'
                                : 'grayscale(0.9)',
                            }}
                            onClick={() => {
                              if (!file.Url) {
                                return;
                              }

                              if (!isSubscriptionActive) {
                                onRequireSubscription();
                                return;
                              }

                              handleSummarizeAttachment(
                                file.Url,
                                file.FileName,
                              );
                            }}
                          >
                            {summaryData?.loading
                              ? 'Summarizing...'
                              : 'Summarize'}
                          </Button>
                        </Stack>
                        {!hasAttachmentUrl && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mt: 0.5 }}
                          >
                            Attachment URL unavailable for this file.
                          </Typography>
                        )}
                        {summaryData?.summary && (
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 1,
                              bgcolor: 'background.default',
                              mt: 0.5,
                            }}
                          >
                            <Stack spacing={0.5}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Summary:
                              </Typography>
                              <Typography variant="body2">
                                {summaryData.summary}
                              </Typography>
                            </Stack>
                          </Paper>
                        )}
                        {summaryData?.error && (
                          <Typography
                            variant="caption"
                            color="error"
                            sx={{ mt: 0.5 }}
                          >
                            Error: {summaryData.error}
                          </Typography>
                        )}
                        {downloadData?.error && (
                          <Typography
                            variant="caption"
                            color="error"
                            sx={{ mt: 0.5 }}
                          >
                            Download error: {downloadData.error}
                          </Typography>
                        )}
                        {downloadData?.path && !downloadData.error && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mt: 0.5, wordBreak: 'break-all' }}
                          >
                            Cached file: {downloadData.path}
                          </Typography>
                        )}
                      </Stack>
                    </Paper>
                  );
                })}
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

        <Button
          variant="contained"
          color="secondary"
          disabled={isSummarizingAssignment}
          sx={{
            alignSelf: 'flex-start',
            mt: 1,
            opacity: isSubscriptionActive ? 1 : 0.55,
            filter: isSubscriptionActive ? 'none' : 'grayscale(0.9)',
          }}
          onClick={() => {
            if (!isSubscriptionActive) {
              onRequireSubscription();
              return;
            }

            handleSummarizeAssignment();
          }}
        >
          {isSummarizingAssignment
            ? 'Summarizing Assignment...'
            : 'Summarize Full Assignment'}
        </Button>

        {assignmentSummary && (
          <Paper
            variant="outlined"
            sx={{ p: 1.5, bgcolor: 'background.default' }}
          >
            <Stack spacing={1}>
              <Typography variant="subtitle1" fontWeight={700}>
                Assignment Summary
              </Typography>
              <Divider />
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {assignmentSummary}
              </Typography>
            </Stack>
          </Paper>
        )}

        {assignmentSummaryError && (
          <Typography variant="body2" color="error">
            {assignmentSummaryError}
          </Typography>
        )}
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
          {renderDownloadButton(
            contentItemDetails.url,
            undefined,
            contentItemDetails.title,
          )}
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
      <Stack spacing={2.5}>
        {/* Course Header Banner */}
        <Paper
          elevation={2}
          sx={{
            p: 2.5,
            background: 'linear-gradient(135deg, #1e5f54 0%, #2a7a6f 100%)',
            color: 'white',
            mx: -2,
            mt: -2,
            mb: 1,
          }}
        >
          <Stack spacing={1}>
            <Typography variant="h4" fontWeight={800}>
              {course.name}
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.95 }}>
              {course.full_code}
              {course.section_number && ` • Section ${course.section_number}`}
            </Typography>
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              flexWrap="wrap"
              sx={{ pt: 1 }}
            >
              <Chip
                label={course.is_active ? 'Active' : 'Inactive'}
                color={course.is_active ? 'success' : 'default'}
                variant="filled"
                sx={{
                  bgcolor: course.is_active ? 'rgba(76, 175, 80, 0.9)' : 'rgba(158, 158, 158, 0.6)',
                  color: 'white',
                  fontWeight: 600,
                }}
              />
              <Chip
                label={`${course.semester.term} ${course.semester.year}`}
                variant="outlined"
                sx={{
                  borderColor: 'rgba(255, 255, 255, 0.7)',
                  color: 'white',
                }}
              />
              <Chip
                label={`Ends: ${endsAt}`}
                variant="outlined"
                sx={{
                  borderColor: 'rgba(255, 255, 255, 0.7)',
                  color: 'white',
                }}
              />
            </Stack>
          </Stack>
        </Paper>

        {/* Course Information Grid */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
              COURSE INFORMATION
            </Typography>
            <Stack
              spacing={1.5}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
              }}
            >
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default' }}>
                <Stack spacing={0.5}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary">
                    Full Code
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {course.full_code}
                  </Typography>
                </Stack>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default' }}>
                <Stack spacing={0.5}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary">
                    Semester
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {course.semester.term} {course.semester.year}
                  </Typography>
                </Stack>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default' }}>
                <Stack spacing={0.5}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary">
                    Section
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {course.section_number ?? 'N/A'}
                  </Typography>
                </Stack>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default' }}>
                <Stack spacing={0.5}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary">
                    Course Ends
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {endsAt}
                  </Typography>
                </Stack>
              </Paper>
            </Stack>
          </Stack>
        </Paper>

        {/* Instructors Section */}
        {!isLoadingCourseDetails && courseInstructors.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                INSTRUCTORS
              </Typography>
              <Stack spacing={1}>
                {courseInstructors.map((instructor) => (
                  <Paper
                    key={instructor.email || instructor.displayName}
                    variant="outlined"
                    sx={{ p: 1.5, bgcolor: 'background.default' }}
                  >
                    <Stack spacing={0.5}>
                      <Typography variant="body2" fontWeight={600}>
                        {instructor.displayName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {instructor.role}
                      </Typography>
                      {instructor.email && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'primary.main',
                            textDecoration: 'none',
                            '&:hover': { textDecoration: 'underline' },
                          }}
                          component="a"
                          href={`mailto:${instructor.email}`}
                        >
                          {instructor.email}
                        </Typography>
                      )}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Stack>
          </Paper>
        )}

        {/* Course Description Section */}
        {!isLoadingCourseDetails && courseDescription && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                COURSE DESCRIPTION
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.primary',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: 1.6,
                }}
              >
                {courseDescription}
              </Typography>
            </Stack>
          </Paper>
        )}

        {/* Loading State */}
        {isLoadingCourseDetails && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            Loading course details...
          </Typography>
        )}
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
