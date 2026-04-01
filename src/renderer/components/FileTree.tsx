import { SyntheticEvent, useEffect, useState } from 'react';
import { TreeViewBaseItem } from '@mui/x-tree-view';
import { RichTreeView } from '@mui/x-tree-view/RichTreeView';

export interface CourseTreeItem {
  full_code: string;
  full_name: string;
  org_unit_id: number;
  name: string;
  section_number: string | null;
  ends_at: string | Date;
  is_active: boolean;
  semester: {
    year: number;
    term: 'Winter' | 'Spring' | 'Fall';
  };
}

interface AssignmentTreeItem {
  name: string;
  due_at: string | Date | null;
}

interface FileTreeProps {
  onSelectCourse: (course: CourseTreeItem | null) => void;
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

export default function FileTree({ onSelectCourse }: FileTreeProps) {
  const [items, setItems] = useState<TreeViewBaseItem[]>([]);
  const [courseByItemId, setCourseByItemId] = useState<
    Map<string, CourseTreeItem>
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

        if (cancelled) {
          return;
        }

        const semesterMap = courses.reduce(
          (map, course) => {
            const key = semesterId(course.semester);
            const existing = map.get(key);

            if (existing) {
              existing.courses.push(course);
              existing.hasActiveCourse =
                existing.hasActiveCourse || course.is_active;
              return map;
            }

            map.set(key, {
              semester: course.semester,
              courses: [course],
              hasActiveCourse: course.is_active,
            });

            return map;
          },
          new Map<
            string,
            {
              semester: CourseTreeItem['semester'];
              courses: CourseTreeItem[];
              hasActiveCourse: boolean;
            }
          >(),
        );

        const sortedSemesters = Array.from(semesterMap.values()).sort(
          (a, b) => {
            if (a.semester.year !== b.semester.year) {
              return b.semester.year - a.semester.year;
            }

            return (
              TERM_SORT_ORDER[b.semester.term] -
              TERM_SORT_ORDER[a.semester.term]
            );
          },
        );

        const groupedItems: TreeViewBaseItem[] = sortedSemesters.map(
          (entry) => {
            const sortedCourses = [...entry.courses].sort((a, b) =>
              a.name.localeCompare(b.name),
            );

            return {
              id: semesterId(entry.semester),
              label: `${semesterLabel(entry.semester)} (${sortedCourses.length})`,
              children: sortedCourses.map((course) => ({
                id: `course-${course.org_unit_id}`,
                label: course.section_number
                  ? `${course.name} (${course.section_number})`
                  : course.name,
                children: [
                  {
                    id: `course-${course.org_unit_id}-assignments-folder`,
                    label: 'Assignments',
                    children: (
                      assignmentsByCourse.get(course.org_unit_id) ?? []
                    ).map((assignment, index) => ({
                      id: `course-${course.org_unit_id}-assignment-${index}`,
                      label: assignment.due_at
                        ? `${assignment.name} (Due ${new Date(
                            assignment.due_at,
                          ).toLocaleDateString()})`
                        : assignment.name,
                    })),
                  },
                ],
              })),
            };
          },
        );

        const itemCourseMap = new Map<string, CourseTreeItem>();
        courses.forEach((course) => {
          itemCourseMap.set(`course-${course.org_unit_id}`, course);
        });

        setItems(groupedItems);
        setCourseByItemId(itemCourseMap);
        setDefaultExpandedItems(
          sortedSemesters
            .filter((entry) => entry.hasActiveCourse)
            .map((entry) => semesterId(entry.semester)),
        );
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
    return <p>Loading courses...</p>;
  }

  if (error) {
    return <p>Could not load courses.</p>;
  }

  const hasCourses = items.some((item) => (item.children?.length ?? 0) > 0);

  if (!hasCourses) {
    return <p>No courses found.</p>;
  }

  const handleSelectionChange = (
    _event: SyntheticEvent | null,
    itemIds: string | null,
  ) => {
    const selectedItemId = Array.isArray(itemIds) ? itemIds[0] : itemIds;

    if (!selectedItemId || !selectedItemId.startsWith('course-')) {
      onSelectCourse(null);
      return;
    }

    onSelectCourse(courseByItemId.get(selectedItemId) ?? null);
  };

  return (
    <RichTreeView
      items={items}
      defaultExpandedItems={defaultExpandedItems}
      onSelectedItemsChange={handleSelectionChange}
    />
  );
}
