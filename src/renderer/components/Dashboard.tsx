import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { AssignmentTreeItem, CourseTreeItem, Semester } from './types';

interface DashboardAssignment extends AssignmentTreeItem {
  courseName: string;
  courseCode: string;
}

interface DashboardData {
  semester: Semester;
  courses: CourseTreeItem[];
  outstandingAssignments: DashboardAssignment[];
  completedAssignments: DashboardAssignment[];
  averagePercent: number | null;
  estimatedGpa: number | null;
}

interface DashboardPayload {
  courses: CourseTreeItem[];
  assignmentsByCourse: Record<number, AssignmentTreeItem[]>;
}

function getCurrentCalendarSemester(date = new Date()): Semester {
  const month = date.getMonth();

  if (month < 4) {
    return { year: date.getFullYear(), term: 'Winter' };
  }

  if (month < 8) {
    return { year: date.getFullYear(), term: 'Spring' };
  }

  return { year: date.getFullYear(), term: 'Fall' };
}

function semesterLabel(semester: Semester): string {
  return `${semester.term} ${semester.year}`;
}

function isIncompleteAssignment(assignment: AssignmentTreeItem): boolean {
  return (
    assignment.status === 0 ||
    assignment.status === 2 ||
    assignment.due_at === null
  );
}

function hasGrade(assignment: AssignmentTreeItem): boolean {
  return assignment.grade !== null;
}

function getDaysUntilDue(dueAt: string | Date | null): number | null {
  if (!dueAt) {
    return null;
  }

  const dueDate = new Date(dueAt).getTime();
  const now = Date.now();
  return Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
}

function percentageToGpa(percent: number): number {
  if (percent >= 93) return 4.0;
  if (percent >= 90) return 3.7;
  if (percent >= 87) return 3.3;
  if (percent >= 83) return 3.0;
  if (percent >= 80) return 2.7;
  if (percent >= 77) return 2.3;
  if (percent >= 73) return 2.0;
  if (percent >= 70) return 1.7;
  if (percent >= 67) return 1.3;
  if (percent >= 63) return 1.0;
  if (percent >= 60) return 0.7;
  return 0.0;
}

function formatPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return 'N/A';
  }

  return `${value.toFixed(1)}%`;
}

function formatGpa(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return 'N/A';
  }

  return value.toFixed(2);
}

function getAssignmentStatusLabel(assignment: DashboardAssignment): string {
  if (assignment.status === 1) {
    return 'Submitted';
  }

  if (assignment.status === 2) {
    return 'Draft';
  }

  return 'Needs completion';
}

function getAssignmentStatusColor(
  assignment: DashboardAssignment,
  daysUntilDue: number | null,
): 'success' | 'warning' | 'error' | 'default' {
  if (assignment.status === 1) {
    return 'success';
  }

  if (daysUntilDue !== null && daysUntilDue < 0) {
    return 'error';
  }

  if (daysUntilDue !== null && daysUntilDue <= 7) {
    return 'warning';
  }

  return 'default';
}

function getDueLabel(daysUntilDue: number | null): string {
  if (daysUntilDue === null) {
    return 'No due date';
  }

  if (daysUntilDue < 0) {
    const overdueDays = Math.abs(daysUntilDue);
    return `Overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}`;
  }

  if (daysUntilDue === 0) {
    return 'Due today';
  }

  return `Due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`;
}

function buildDashboardData(
  courses: CourseTreeItem[],
  assignmentsByCourse: Record<number, AssignmentTreeItem[]>,
): DashboardData {
  const semester = getCurrentCalendarSemester();
  const semesterCourses = courses.filter(
    (course) =>
      course.semester.year === semester.year &&
      course.semester.term === semester.term,
  );

  const dashboardAssignments: DashboardAssignment[] = [];
  const outstandingAssignments: DashboardAssignment[] = [];
  const completedAssignments: DashboardAssignment[] = [];

  let weightedPercentTotal = 0;
  let weightTotal = 0;

  semesterCourses.forEach((course) => {
    const assignments = assignmentsByCourse[course.org_unit_id] ?? [];

    assignments.forEach((assignment) => {
      const dashboardAssignment = {
        ...assignment,
        courseName: course.name,
        courseCode: course.full_code,
      };

      dashboardAssignments.push(dashboardAssignment);

      if (
        isIncompleteAssignment(dashboardAssignment) &&
        !hasGrade(dashboardAssignment)
      ) {
        outstandingAssignments.push(dashboardAssignment);
      } else {
        completedAssignments.push(dashboardAssignment);
      }

      const { grade } = dashboardAssignment;
      const points = grade?.points;
      if (!points || points.denominator <= 0) {
        return;
      }

      const percent = (points.numerator / points.denominator) * 100;
      const weight = grade?.weight?.denominator
        ? grade.weight.numerator / grade.weight.denominator
        : 1;

      weightedPercentTotal += percent * weight;
      weightTotal += weight;
    });
  });

  outstandingAssignments.sort((a, b) => {
    const aDue = a.due_at
      ? new Date(a.due_at).getTime()
      : Number.POSITIVE_INFINITY;
    const bDue = b.due_at
      ? new Date(b.due_at).getTime()
      : Number.POSITIVE_INFINITY;
    return aDue - bDue;
  });

  const averagePercent =
    weightTotal > 0 ? weightedPercentTotal / weightTotal : null;
  const estimatedGpa =
    averagePercent === null ? null : percentageToGpa(averagePercent);

  return {
    semester,
    courses: semesterCourses,
    outstandingAssignments,
    completedAssignments,
    averagePercent,
    estimatedGpa,
  };
}

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const dashboardResponse = (await window.electron.ipcRenderer.invoke(
          'get-dashboard-data',
        )) as DashboardPayload;
        const { courses, assignmentsByCourse } = dashboardResponse;

        const dashboardData = buildDashboardData(courses, assignmentsByCourse);

        if (!cancelled) {
          setData(dashboardData);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Failed to load dashboard data.',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Box display="flex" alignItems="center" gap={1.5} py={1}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Loading dashboard...
          </Typography>
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Alert severity="error" variant="outlined">
        {error}
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert severity="info" variant="outlined">
        No dashboard data available.
      </Alert>
    );
  }

  const hasOutstandingAssignments = data.outstandingAssignments.length > 0;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, md: 2.5 },
        bgcolor: 'background.paper',
      }}
    >
      <Stack spacing={2.5}>
        <Stack spacing={0.75}>
          <Typography variant="h4" fontWeight={800}>
            Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {semesterLabel(data.semester)} overview
          </Typography>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">
                Current semester
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {semesterLabel(data.semester)}
              </Typography>
            </Stack>
          </Paper>
          <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">
                Courses
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {data.courses.length}
              </Typography>
            </Stack>
          </Paper>
          <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">
                Assignments remaining
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {data.outstandingAssignments.length}
              </Typography>
            </Stack>
          </Paper>
          <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">
                Estimated GPA
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {formatGpa(data.estimatedGpa)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg. {formatPercent(data.averagePercent)}
              </Typography>
            </Stack>
          </Paper>
        </Stack>

        <Paper
          variant="outlined"
          sx={{
            p: 2,
            bgcolor: 'background.default',
          }}
        >
          <Stack spacing={1.5}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', md: 'center' }}
              spacing={1}
            >
              <Typography variant="h6" fontWeight={700}>
                Assignments to complete
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {hasOutstandingAssignments
                  ? `${data.outstandingAssignments.length} item${
                      data.outstandingAssignments.length === 1 ? '' : 's'
                    } need attention`
                  : 'No outstanding assignments found'}
              </Typography>
            </Stack>
            <Divider />
            {hasOutstandingAssignments ? (
              <Stack spacing={1.25}>
                {data.outstandingAssignments.map((assignment) => {
                  const daysUntilDue = getDaysUntilDue(assignment.due_at);
                  const dueLabel = getDueLabel(daysUntilDue);

                  return (
                    <Paper
                      key={`${assignment.courseCode}-${assignment.name}`}
                      variant="outlined"
                      sx={{ p: 1.5, bgcolor: 'background.paper' }}
                    >
                      <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        justifyContent="space-between"
                        spacing={1}
                      >
                        <Stack spacing={0.5}>
                          <Typography variant="subtitle1" fontWeight={700}>
                            {assignment.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {assignment.courseName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {assignment.due_at
                              ? `Due ${new Date(assignment.due_at).toLocaleDateString()}`
                              : 'No due date'}
                          </Typography>
                        </Stack>
                        <Stack
                          spacing={0.75}
                          alignItems={{ xs: 'flex-start', md: 'flex-end' }}
                        >
                          <Chip
                            size="small"
                            label={getAssignmentStatusLabel(assignment)}
                            color={getAssignmentStatusColor(
                              assignment,
                              daysUntilDue,
                            )}
                          />
                          <Typography variant="body2" color="text.secondary">
                            {dueLabel}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            ) : (
              <Typography variant="body1" color="text.secondary">
                Everything in this semester appears submitted or complete.
              </Typography>
            )}
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
          <Stack spacing={1.5}>
            <Typography variant="h6" fontWeight={700}>
              Semester summary
            </Typography>
            <Divider />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
                <Stack spacing={0.5}>
                  <Typography variant="body2" color="text.secondary">
                    Completed assignments
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {data.completedAssignments.length}
                  </Typography>
                </Stack>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
                <Stack spacing={0.5}>
                  <Typography variant="body2" color="text.secondary">
                    Total assignments
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {data.completedAssignments.length +
                      data.outstandingAssignments.length}
                  </Typography>
                </Stack>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
                <Stack spacing={0.5}>
                  <Typography variant="body2" color="text.secondary">
                    Courses with assignments
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {data.courses.length}
                  </Typography>
                </Stack>
              </Paper>
            </Stack>
          </Stack>
        </Paper>
      </Stack>
    </Paper>
  );
}
