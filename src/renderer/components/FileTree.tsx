import { SyntheticEvent, useEffect, useState } from 'react';
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

async function fetchAssignmentsByCourse(
  courses: CourseTreeItem[],
): Promise<Map<number, AssignmentTreeItem[]>> {
  const assignmentsByCourse = new Map<number, AssignmentTreeItem[]>();

  await Promise.all(
    courses.map(async (course) => {
      try {
        const assignments = (await window.electron.ipcRenderer.invoke(
          'get-assignments',
          course.org_unit_id,
        )) as AssignmentTreeItem[];
        assignmentsByCourse.set(course.org_unit_id, assignments);
      } catch {
        assignmentsByCourse.set(course.org_unit_id, []);
      }
    }),
  );

  return assignmentsByCourse;
}

async function fetchContentByCourse(
  courses: CourseTreeItem[],
): Promise<Map<number, ContentNode[]>> {
  const contentByCourse = new Map<number, ContentNode[]>();

  await Promise.all(
    courses.map(async (course) => {
      try {
        const content = (await window.electron.ipcRenderer.invoke(
          'get-content',
          course.org_unit_id,
        )) as ContentNode[];
        contentByCourse.set(course.org_unit_id, content);
      } catch {
        contentByCourse.set(course.org_unit_id, []);
      }
    }),
  );

  return contentByCourse;
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

function buildTreeData(
  courses: CourseTreeItem[],
  assignmentsByCourse: Map<number, AssignmentTreeItem[]>,
  contentByCourse: Map<number, ContentNode[]>,
): TreeData {
  const sortedSemesters = sortSemesters(
    Array.from(buildSemesterMap(courses).values()),
  );

  const assignmentByItemId = new Map<string, AssignmentTreeItem>();
  const courseByItemId = new Map<string, CourseTreeItem>();
  const contentModuleByItemId = new Map<string, ContentModule>();
  const contentItemByItemId = new Map<string, ContentModuleItem>();

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

        const assignmentChildren = (
          assignmentsByCourse.get(course.org_unit_id) ?? []
        ).map((assignment, index) => {
          const assignmentId = `${courseId}-assignment-${index}`;
          assignmentByItemId.set(assignmentId, assignment);

          return {
            id: assignmentId,
            label: assignment.due_at
              ? `${assignment.name} (Due ${new Date(assignment.due_at).toLocaleDateString()})`
              : assignment.name,
          };
        });

        const contentNodes = contentByCourse.get(course.org_unit_id) ?? [];
        const contentFolderId = `${courseId}-content-folder`;
        const contentFolderNode: ContentModule = {
          kind: 'folder',
          Id: -course.org_unit_id,
          Title: 'Content',
          Children: contentNodes,
        };
        contentModuleByItemId.set(contentFolderId, contentFolderNode);

        const contentChildren = buildContentTree(contentNodes, contentFolderId);

        const courseChildren: TreeViewBaseItem[] = [
          {
            id: `${courseId}-assignments-folder`,
            label: 'Assignments',
            children: assignmentChildren,
          },
        ];

        if (contentChildren.length > 0) {
          courseChildren.push({
            id: contentFolderId,
            label: 'Content',
            children: contentChildren,
          });
        }

        return {
          id: courseId,
          label: course.section_number
            ? `${course.name} (${course.section_number})`
            : course.name,
          children: courseChildren,
        };
      }),
    };
  });

  return {
    items: [{ id: 'dashboard', label: 'Dashboard' }, ...semesterItems],
    courseByItemId,
    assignmentByItemId,
    contentModuleByItemId,
    contentItemByItemId,
    defaultExpandedItems: sortedSemesters
      .filter((entry) => entry.hasActiveCourse)
      .map((entry) => semesterId(entry.semester)),
  };
}

export default function FileTree({
  onSelectCourse,
  onSelectAssignment,
  onSelectContentModule,
  onSelectContentItem,
  onSelectDashboard,
}: FileTreeProps) {
  const [items, setItems] = useState<TreeViewBaseItem[]>([]);
  const [courseByItemId, setCourseByItemId] = useState<
    Map<string, CourseTreeItem>
  >(new Map());
  const [assignmentByItemId, setAssignmentByItemId] = useState<
    Map<string, AssignmentTreeItem>
  >(new Map());
  const [contentModuleByItemId, setContentModuleByItemId] = useState<
    Map<string, ContentModule>
  >(new Map());
  const [contentItemByItemId, setContentItemByItemId] = useState<
    Map<string, ContentModuleItem>
  >(new Map());
  const [defaultExpandedItems, setDefaultExpandedItems] = useState<string[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCourses = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const courses = (await window.electron.ipcRenderer.invoke(
          'get-courses',
        )) as CourseTreeItem[];

        if (cancelled) {
          return;
        }

        const assignmentsByCourse = await fetchAssignmentsByCourse(courses);
        const contentByCourse = await fetchContentByCourse(courses);

        if (cancelled) {
          return;
        }

        const treeData = buildTreeData(
          courses,
          assignmentsByCourse,
          contentByCourse,
        );

        setItems(treeData.items);
        setCourseByItemId(treeData.courseByItemId);
        setAssignmentByItemId(treeData.assignmentByItemId);
        setContentModuleByItemId(treeData.contentModuleByItemId);
        setContentItemByItemId(treeData.contentItemByItemId);
        setDefaultExpandedItems(treeData.defaultExpandedItems);
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

  const hasCourses = items.some((item) => (item.children?.length ?? 0) > 0);

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

    const selectedAssignment = assignmentByItemId.get(selectedItemId);
    if (selectedAssignment) {
      onSelectCourse(null);
      onSelectContentModule(null);
      onSelectContentItem(null);
      onSelectAssignment(selectedAssignment);
      return;
    }

    const selectedContentItem = contentItemByItemId.get(selectedItemId);
    if (selectedContentItem) {
      onSelectCourse(null);
      onSelectAssignment(null);
      onSelectContentModule(null);
      onSelectContentItem(selectedContentItem);
      return;
    }

    const selectedContentModule = contentModuleByItemId.get(selectedItemId);
    if (selectedContentModule) {
      onSelectCourse(null);
      onSelectAssignment(null);
      onSelectContentItem(null);
      onSelectContentModule(selectedContentModule);
      return;
    }

    const selectedCourse = courseByItemId.get(selectedItemId);
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
      <RichTreeView
        items={items}
        defaultExpandedItems={defaultExpandedItems}
        onSelectedItemsChange={handleSelectionChange}
      />
    </Box>
  );
}
