import { useEffect, useState } from 'react';
import { TreeViewBaseItem } from '@mui/x-tree-view';
import { RichTreeView } from '@mui/x-tree-view/RichTreeView';

interface CourseTreeItem {
  org_unit_id: number;
  name: string;
  is_active: boolean;
  semester: {
    year: number;
    term: 'Winter' | 'Spring' | 'Fall';
  };
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

export default function FileTree() {
  const [items, setItems] = useState<TreeViewBaseItem[]>([]);
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
                label: course.name,
              })),
            };
          },
        );

        setItems(groupedItems);
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

  return (
    <RichTreeView items={items} defaultExpandedItems={defaultExpandedItems} />
  );
}
