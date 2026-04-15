import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AssignmentTreeItem, CourseTreeItem, Semester } from './types';

interface DashboardPayload {
  courses: CourseTreeItem[];
  assignmentsByCourse: Record<number, AssignmentTreeItem[]>;
}

interface GradeItemView {
  id: string;
  name: string;
  percent: number | null;
  letter: string;
  worthPercent: number | null;
}

interface CourseView {
  course: CourseTreeItem;
  items: GradeItemView[];
  percent: number | null;
  letter: string;
  totalWeightPercent: number | null;
  remainingWeightPercent: number | null;
  hours: number | null;
  gradePoint: number | null;
}

interface GpaData {
  semester: Semester;
  courses: CourseView[];
  semesterGpa: number | null;
  totalHours: number | null;
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

function formatPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return 'N/A';
  }

  return `${value.toFixed(1)}%`;
}

function formatWorthPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return 'N/A';
  }

  if (Number.isInteger(value)) {
    return `${value}%`;
  }

  return `${value.toFixed(1)}%`;
}

function formatGpa(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return 'N/A';
  }

  return value.toFixed(2);
}

function percentageToGpa(percent: number): number {
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

function gpaToLetter(gpa: number | null): string {
  if (gpa === null || Number.isNaN(gpa)) {
    return 'N/A';
  }

  if (gpa >= 4.0) return 'A+';
  if (gpa >= 3.8) return 'A';
  if (gpa >= 3.6) return 'A-';
  if (gpa >= 3.3) return 'B+';
  if (gpa >= 3.0) return 'B';
  if (gpa >= 2.7) return 'B-';
  if (gpa >= 2.3) return 'C+';
  if (gpa >= 2.0) return 'C';
  if (gpa >= 1.7) return 'C-';
  if (gpa >= 1.4) return 'D+';
  if (gpa >= 1.2) return 'D';
  if (gpa >= 1.0) return 'D-';
  return 'F';
}

function getCurrentSemesterLabel(courses: CourseTreeItem[]): string {
  const semester = getCurrentCalendarSemester();
  const matchingCourse = courses.find(
    (course) =>
      course.semester.year === semester.year &&
      course.semester.term === semester.term,
  );

  if (matchingCourse) {
    return semesterLabel(matchingCourse.semester);
  }

  return semesterLabel(semester);
}

function buildGpaData(
  courses: CourseTreeItem[],
  assignmentsByCourse: Record<number, AssignmentTreeItem[]>,
  hoursByCourse: Record<number, string>,
): GpaData {
  const semester = getCurrentCalendarSemester();
  const semesterCourses = courses.filter(
    (course) =>
      course.semester.year === semester.year &&
      course.semester.term === semester.term,
  );

  const courseViews = semesterCourses.map((course) => {
    const assignments = assignmentsByCourse[course.org_unit_id] ?? [];
    const items: GradeItemView[] = [];
    let weightedPercentTotal = 0;
    let gradedWeightTotal = 0;
    let totalWeightPercent = 0;
    let hasWeight = false;

    assignments.forEach((assignment) => {
      const { grade } = assignment;
      const { points } = grade ?? {};
      const gradeWeight = grade?.weight ?? null;
      const worthPercent =
        gradeWeight !== null && gradeWeight.denominator > 0
          ? gradeWeight.denominator
          : null;
      const weightFactor = worthPercent === null ? null : worthPercent / 100;

      if (worthPercent !== null) {
        hasWeight = true;
        totalWeightPercent += worthPercent;
      }

      const percent =
        points && points.denominator > 0
          ? (points.numerator / points.denominator) * 100
          : null;

      if (percent !== null && weightFactor !== null) {
        weightedPercentTotal += percent * weightFactor;
        gradedWeightTotal += weightFactor;
      }

      items.push({
        id: grade?.id ?? `${course.org_unit_id}-${assignment.name}`,
        name: grade?.name ?? assignment.name,
        percent,
        letter: percentageToLetter(percent),
        worthPercent,
      });
    });

    const percent =
      gradedWeightTotal > 0 ? weightedPercentTotal / gradedWeightTotal : null;
    const gradePoint = percent === null ? null : percentageToGpa(percent);
    const hoursValue = Number(hoursByCourse[course.org_unit_id]);
    const hours =
      Number.isFinite(hoursValue) && hoursValue > 0 ? hoursValue : null;

    return {
      course,
      items,
      percent,
      letter: percentageToLetter(percent),
      totalWeightPercent: hasWeight ? totalWeightPercent : null,
      remainingWeightPercent: hasWeight
        ? Math.max(0, 100 - totalWeightPercent)
        : null,
      hours,
      gradePoint,
    };
  });

  let weightedGpaTotal = 0;
  let totalHours = 0;

  courseViews.forEach((courseView) => {
    if (courseView.gradePoint === null || courseView.hours === null) {
      return;
    }

    weightedGpaTotal += courseView.gradePoint * courseView.hours;
    totalHours += courseView.hours;
  });

  return {
    semester,
    courses: courseViews,
    semesterGpa: totalHours > 0 ? weightedGpaTotal / totalHours : null,
    totalHours: totalHours > 0 ? totalHours : null,
  };
}

export default function GpaCalculator() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [hoursByCourse, setHoursByCourse] = useState<Record<number, string>>(
    {},
  );

  useEffect(() => {
    let cancelled = false;

    const loadGpaData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const loadedPayload = (await window.electron.ipcRenderer.invoke(
          'get-dashboard-data',
        )) as DashboardPayload;

        if (cancelled) {
          return;
        }

        setPayload(loadedPayload);
        setHoursByCourse((current) => {
          const next = { ...current };

          loadedPayload.courses.forEach((course) => {
            if (next[course.org_unit_id] === undefined) {
              next[course.org_unit_id] = '';
            }
          });

          return next;
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Failed to load GPA data.',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadGpaData();

    return () => {
      cancelled = true;
    };
  }, []);

  const currentData = useMemo(() => {
    if (!payload) {
      return null;
    }

    return buildGpaData(
      payload.courses,
      payload.assignmentsByCourse,
      hoursByCourse,
    );
  }, [hoursByCourse, payload]);

  if (isLoading) {
    return (
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Box display="flex" alignItems="center" gap={1.5} py={1}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Loading GPA calculator...
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

  if (!payload || currentData === null) {
    return (
      <Alert severity="info" variant="outlined">
        No GPA data available.
      </Alert>
    );
  }

  const hasCourses = currentData.courses.length > 0;
  const totalEnteredHours = currentData.courses.reduce((sum, course) => {
    return sum + (course.hours ?? 0);
  }, 0);

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
            GPA Calculator
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {getCurrentSemesterLabel(payload.courses)} semester overview and GPA
            estimate
          </Typography>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">
                Semester GPA
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {`${formatGpa(currentData.semesterGpa)} (${gpaToLetter(currentData.semesterGpa)})`}
              </Typography>
            </Stack>
          </Paper>
          <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">
                Hours entered
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {totalEnteredHours > 0 ? totalEnteredHours.toFixed(1) : 'N/A'}
              </Typography>
            </Stack>
          </Paper>
          <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">
                Courses
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {currentData.courses.length}
              </Typography>
            </Stack>
          </Paper>
          <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">
                GPA basis
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                Normative hours
              </Typography>
            </Stack>
          </Paper>
        </Stack>

        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
          <Stack spacing={1.5}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', md: 'center' }}
              spacing={1}
            >
              <Typography variant="h6" fontWeight={700}>
                Courses
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enter normative hours for each course to calculate the semester
                GPA.
              </Typography>
            </Stack>
            <Divider />

            {hasCourses ? (
              <Stack spacing={1.5}>
                {currentData.courses.map((courseView) => {
                  const { course } = courseView;

                  return (
                    <Paper
                      key={course.org_unit_id}
                      variant="outlined"
                      sx={{ p: 1.5, bgcolor: 'background.paper' }}
                    >
                      <Stack spacing={1.5}>
                        <Stack
                          direction={{ xs: 'column', md: 'row' }}
                          justifyContent="space-between"
                          alignItems={{ xs: 'stretch', md: 'flex-start' }}
                          spacing={1.5}
                        >
                          <Stack spacing={0.5}>
                            <Typography variant="subtitle1" fontWeight={700}>
                              {course.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {course.full_code}
                            </Typography>
                          </Stack>

                          <TextField
                            label="Normative hours"
                            value={hoursByCourse[course.org_unit_id] ?? ''}
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              setHoursByCourse((current) => ({
                                ...current,
                                [course.org_unit_id]: nextValue,
                              }));
                            }}
                            type="number"
                            inputProps={{ min: 0, step: 0.5 }}
                            size="small"
                            sx={{ width: { xs: '100%', md: 180 } }}
                          />
                        </Stack>

                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Chip
                            size="small"
                            label={`${formatPercent(courseView.percent)} (${courseView.letter})`}
                            color={
                              courseView.percent === null
                                ? 'default'
                                : 'primary'
                            }
                          />
                          <Chip
                            size="small"
                            label={`Total weight ${formatPercent(courseView.totalWeightPercent)}`}
                            variant="outlined"
                          />
                          <Chip
                            size="small"
                            label={`Remaining ${formatPercent(courseView.remainingWeightPercent)}`}
                            variant="outlined"
                          />
                          <Chip
                            size="small"
                            label={`Course GPA ${formatGpa(courseView.gradePoint)} (${gpaToLetter(courseView.gradePoint)})`}
                            variant="outlined"
                          />
                        </Stack>

                        <Divider />

                        {courseView.items.length > 0 ? (
                          <Stack spacing={1}>
                            {courseView.items.map((item) => (
                              <Paper
                                key={item.id}
                                variant="outlined"
                                sx={{ p: 1.25, bgcolor: 'background.default' }}
                              >
                                <Stack
                                  direction={{ xs: 'column', md: 'row' }}
                                  justifyContent="space-between"
                                  spacing={1}
                                >
                                  <Stack spacing={0.25}>
                                    <Typography
                                      variant="subtitle2"
                                      fontWeight={700}
                                    >
                                      {item.name}
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      {item.percent === null
                                        ? 'Not graded yet'
                                        : `${formatPercent(item.percent)} (${item.letter})`}
                                    </Typography>
                                  </Stack>
                                  <Chip
                                    size="small"
                                    label={
                                      item.worthPercent === null
                                        ? 'Worth N/A'
                                        : `Worth: ${formatWorthPercent(item.worthPercent)}`
                                    }
                                  />
                                </Stack>
                              </Paper>
                            ))}
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No graded items found for this course.
                          </Typography>
                        )}
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            ) : (
              <Typography variant="body1" color="text.secondary">
                No courses found for the current semester.
              </Typography>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Paper>
  );
}
