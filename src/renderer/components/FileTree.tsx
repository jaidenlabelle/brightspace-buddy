import { SyntheticEvent, useEffect, useMemo, useState } from 'react';
import { TreeViewBaseItem } from '@mui/x-tree-view';
import { RichTreeView } from '@mui/x-tree-view/RichTreeView';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import {
  AssignmentTreeItem,
  ContentModule,
  ContentModuleItem,
  ContentNode,
  CourseTreeItem,
} from './types';

interface FileTreeProps {
  onSelectCourse: (course: CourseTreeItem | null) => void;
  onSelectAssignment: (assignment: AssignmentTreeItem | null) => void;
  onSelectContentModule: (contentModule: ContentModule | null) => void;
  onSelectContentItem: (contentItem: ContentModuleItem | null) => void;
  onSelectDashboard: () => void;
  onSelectGpaCalculator: () => void;
}

interface SemesterEntry {
  semester: CourseTreeItem['semester'];
  courses: CourseTreeItem[];
  hasActiveCourse: boolean;
}

interface TreeData {
  items: TreeViewBaseItem[];
  courseByItemId: Map<string, CourseTreeItem>;
  assignmentByItemId: Map<string, AssignmentTreeItem>;
  contentModuleByItemId: Map<string, ContentModule>;
  contentItemByItemId: Map<string, ContentModuleItem>;
  defaultExpandedItems: string[];
  hasPendingSections: boolean;
}

const TERM_SORT_ORDER: Record<CourseTreeItem['semester']['term'], number> = {
  Winter: 1,
  Spring: 2,
  Fall: 3,
};

function semesterId(semester: CourseTreeItem['semester']): string {
  return `semester-${semester.year}-${semester.term}`;
}

function semesterLabel(semester: CourseTreeItem['semester']): string {
  return `${semester.year} ${semester.term}`;
}

function sortSemesters(entries: SemesterEntry[]): SemesterEntry[] {
  return entries.sort((a, b) => {
    if (a.semester.year !== b.semester.year) {
      return b.semester.year - a.semester.year;
    }

    return TERM_SORT_ORDER[b.semester.term] - TERM_SORT_ORDER[a.semester.term];
  });
}

function buildSemesterMap(
  courses: CourseTreeItem[],
): Map<string, SemesterEntry> {
  return courses.reduce((map, course) => {
    const key = semesterId(course.semester);
    const existing = map.get(key);

    if (existing) {
      existing.courses.push(course);
      existing.hasActiveCourse = existing.hasActiveCourse || course.is_active;
      return map;
    }

    map.set(key, {
      semester: course.semester,
      courses: [course],
      hasActiveCourse: course.is_active,
    });

    return map;
  }, new Map<string, SemesterEntry>());
}

function buildAssignmentChildren(
  courseId: string,
  assignmentState: AssignmentTreeItem[] | null,
  assignmentByItemId: Map<string, AssignmentTreeItem>,
): TreeViewBaseItem[] {
  if (assignmentState === null) {
    return [
      {
        id: `${courseId}-assignments-loading`,
        label: 'Loading assignments...',
      },
    ];
  }

  if (assignmentState.length === 0) {
    return [
      {
        id: `${courseId}-assignments-empty`,
        label: 'No assignments found',
      },
    ];
  }

  return assignmentState.map((assignment, index) => {
    const assignmentId = `${courseId}-assignment-${index}`;
    assignmentByItemId.set(assignmentId, assignment);

    return {
      id: assignmentId,
      label: assignment.due_at
        ? `${assignment.name} (Due ${new Date(assignment.due_at).toLocaleDateString()})`
        : assignment.name,
    };
  });
}

function buildContentChildren(
  courseId: string,
  contentState: ContentNode[] | null,
  contentFolderId: string,
  buildContentTree: (
    contentNodes: ContentNode[],
    parentId: string,
  ) => TreeViewBaseItem[],
): TreeViewBaseItem[] {
  if (contentState === null) {
    return [
      {
        id: `${courseId}-content-loading`,
        label: 'Loading content...',
      },
    ];
  }

  if (contentState.length === 0) {
    return [
      {
        id: `${courseId}-content-empty`,
        label: 'No content found',
      },
    ];
  }

  return buildContentTree(contentState, contentFolderId);
}

function buildTreeData(
  courses: CourseTreeItem[],
  assignmentsByCourse: Map<number, AssignmentTreeItem[] | null>,
  contentByCourse: Map<number, ContentNode[] | null>,
): TreeData {
  const sortedSemesters = sortSemesters(
    Array.from(buildSemesterMap(courses).values()),
  );

  const assignmentByItemId = new Map<string, AssignmentTreeItem>();
  const courseByItemId = new Map<string, CourseTreeItem>();
  const contentModuleByItemId = new Map<string, ContentModule>();
  const contentItemByItemId = new Map<string, ContentModuleItem>();

  let hasPendingSections = false;

  const buildContentTree = (
    contentNodes: ContentNode[],
    parentId: string,
  ): TreeViewBaseItem[] => {
    return contentNodes.map((node, index) => {
      const nodeId = `${parentId}-content-${node.Id}-${index}`;

      if (node.kind === 'file') {
        contentItemByItemId.set(nodeId, node);
        return {
          id: nodeId,
          label: node.Title,
        };
      }

      contentModuleByItemId.set(nodeId, node);

      const children = buildContentTree(node.Children, nodeId);

      return {
        id: nodeId,
        label: node.Title,
        children: children.length > 0 ? children : undefined,
      };
    });
  };

  const semesterItems: TreeViewBaseItem[] = sortedSemesters.map((entry) => {
    const sortedCourses = [...entry.courses].sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    return {
      id: semesterId(entry.semester),
      label: `${semesterLabel(entry.semester)} (${sortedCourses.length})`,
      children: sortedCourses.map((course) => {
        const courseId = `course-${course.org_unit_id}`;
        courseByItemId.set(courseId, course);

        const contentFolderId = `${courseId}-content-folder`;
        const assignmentState =
          assignmentsByCourse.get(course.org_unit_id) ?? null;
        const contentState = contentByCourse.get(course.org_unit_id) ?? null;

        contentModuleByItemId.set(contentFolderId, {
          kind: 'folder',
          Id: -course.org_unit_id,
          Title: 'Content',
          Children: contentState ?? [],
        });

        const assignmentChildren = buildAssignmentChildren(
          courseId,
          assignmentState,
          assignmentByItemId,
        );

        const contentChildren = buildContentChildren(
          courseId,
          contentState,
          contentFolderId,
          buildContentTree,
        );

        if (assignmentState === null || contentState === null) {
          hasPendingSections = true;
        }

        return {
          id: courseId,
          label: course.section_number
            ? `${course.name} (${course.section_number})`
            : course.name,
          children: [
            {
              id: `${courseId}-assignments-folder`,
              label: 'Assignments',
              children: assignmentChildren,
            },
            {
              id: contentFolderId,
              label: 'Content',
              children: contentChildren,
            },
          ],
        };
      }),
    };
  });

  return {
    items: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'gpa-calculator', label: 'GPA Calculator' },
      ...semesterItems,
    ],
    courseByItemId,
    assignmentByItemId,
    contentModuleByItemId,
    contentItemByItemId,
    defaultExpandedItems: sortedSemesters
      .filter((entry) => entry.hasActiveCourse)
      .map((entry) => semesterId(entry.semester)),
    hasPendingSections,
  };
}

export default function FileTree({
  onSelectCourse,
  onSelectAssignment,
  onSelectContentModule,
  onSelectContentItem,
  onSelectDashboard,
  onSelectGpaCalculator,
}: FileTreeProps) {
  const [courses, setCourses] = useState<CourseTreeItem[]>([]);
  const [assignmentsByCourse, setAssignmentsByCourse] = useState<
    Map<number, AssignmentTreeItem[] | null>
  >(new Map());
  const [contentByCourse, setContentByCourse] = useState<
    Map<number, ContentNode[] | null>
  >(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const treeData = useMemo(
    () => buildTreeData(courses, assignmentsByCourse, contentByCourse),
    [assignmentsByCourse, contentByCourse, courses],
  );

  useEffect(() => {
    let cancelled = false;

    const loadCourses = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const loadedCourses = (await window.electron.ipcRenderer.invoke(
          'get-courses',
        )) as CourseTreeItem[];

        if (cancelled) {
          return;
        }

        setCourses(loadedCourses);
        setAssignmentsByCourse(
          new Map(loadedCourses.map((course) => [course.org_unit_id, null])),
        );
        setContentByCourse(
          new Map(loadedCourses.map((course) => [course.org_unit_id, null])),
        );

        loadedCourses.forEach((course) => {
          const loadAssignments = async () => {
            try {
              const assignments = (await window.electron.ipcRenderer.invoke(
                'get-assignments',
                course.org_unit_id,
              )) as AssignmentTreeItem[];

              if (cancelled) {
                return;
              }

              setAssignmentsByCourse((current) => {
                const next = new Map(current);
                next.set(course.org_unit_id, assignments);
                return next;
              });
            } catch {
              if (cancelled) {
                return;
              }

              setAssignmentsByCourse((current) => {
                const next = new Map(current);
                next.set(course.org_unit_id, []);
                return next;
              });
            }
          };

          const loadContent = async () => {
            try {
              const content = (await window.electron.ipcRenderer.invoke(
                'get-content',
                course.org_unit_id,
              )) as ContentNode[];

              if (cancelled) {
                return;
              }

              setContentByCourse((current) => {
                const next = new Map(current);
                next.set(course.org_unit_id, content);
                return next;
              });
            } catch {
              if (cancelled) {
                return;
              }

              setContentByCourse((current) => {
                const next = new Map(current);
                next.set(course.org_unit_id, []);
                return next;
              });
            }
          };

          loadAssignments();
          loadContent();
        });
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load courses',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadCourses();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" gap={1.5} py={1}>
        <CircularProgress size={18} />
        <Typography variant="body2" color="text.secondary">
          Loading courses...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" variant="outlined">
        Could not load courses.
      </Alert>
    );
  }

  const hasCourses = treeData.items.some((item) => {
    return (item.children?.length ?? 0) > 0;
  });

  if (!hasCourses) {
    return (
      <Alert severity="info" variant="outlined">
        No courses found.
      </Alert>
    );
  }

  const handleSelectionChange = (
    _event: SyntheticEvent | null,
    itemIds: string | null,
  ) => {
    const selectedItemId = Array.isArray(itemIds) ? itemIds[0] : itemIds;

    if (!selectedItemId) {
      onSelectCourse(null);
      onSelectAssignment(null);
      onSelectContentModule(null);
      onSelectContentItem(null);
      return;
    }

    if (selectedItemId === 'dashboard') {
      onSelectDashboard();
      return;
    }

    if (selectedItemId === 'gpa-calculator') {
      onSelectGpaCalculator();
      return;
    }

    const selectedAssignment = treeData.assignmentByItemId.get(selectedItemId);
    if (selectedAssignment) {
      onSelectCourse(null);
      onSelectContentModule(null);
      onSelectContentItem(null);
      onSelectAssignment(selectedAssignment);
      return;
    }

    const selectedContentItem =
      treeData.contentItemByItemId.get(selectedItemId);
    if (selectedContentItem) {
      onSelectCourse(null);
      onSelectAssignment(null);
      onSelectContentModule(null);
      onSelectContentItem(selectedContentItem);
      return;
    }

    const selectedContentModule =
      treeData.contentModuleByItemId.get(selectedItemId);
    if (selectedContentModule) {
      onSelectCourse(null);
      onSelectAssignment(null);
      onSelectContentItem(null);
      onSelectContentModule(selectedContentModule);
      return;
    }

    const selectedCourse = treeData.courseByItemId.get(selectedItemId);
    if (selectedCourse) {
      onSelectAssignment(null);
      onSelectContentModule(null);
      onSelectContentItem(null);
      onSelectCourse(selectedCourse);
      return;
    }

    onSelectCourse(null);
    onSelectAssignment(null);
    onSelectContentModule(null);
    onSelectContentItem(null);
  };

  return (
    <Box sx={{ py: 0.5 }}>
      {treeData.hasPendingSections ? (
        <Box display="flex" alignItems="center" gap={1} mb={1.25}>
          <CircularProgress size={14} />
          <Typography variant="caption" color="text.secondary">
            Loading explorer content...
          </Typography>
        </Box>
      ) : null}
      <RichTreeView
        items={treeData.items}
        defaultExpandedItems={treeData.defaultExpandedItems}
        onSelectedItemsChange={handleSelectionChange}
      />
    </Box>
  );
}
