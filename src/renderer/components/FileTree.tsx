import { useEffect, useState } from 'react';
import { TreeViewBaseItem } from '@mui/x-tree-view';
import { RichTreeView } from '@mui/x-tree-view/RichTreeView';

interface CourseTreeItem {
  org_unit_id: number;
  name: string;
  is_active: boolean;
}

export default function FileTree() {
  const [items, setItems] = useState<TreeViewBaseItem[]>([]);
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

        const activeCourses = courses
          .filter((course) => course.is_active)
          .map((course) => ({
            id: `course-${course.org_unit_id}`,
            label: course.name,
          }));

        const inactiveCourses = courses
          .filter((course) => !course.is_active)
          .map((course) => ({
            id: `course-${course.org_unit_id}`,
            label: course.name,
          }));

        setItems([
          {
            id: 'active-courses',
            label: `Active Courses (${activeCourses.length})`,
            children: activeCourses,
          },
          {
            id: 'inactive-courses',
            label: `Inactive Courses (${inactiveCourses.length})`,
            children: inactiveCourses,
          },
        ]);
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

  const activeGroup = items.find((item) => item.id === 'active-courses');
  const inactiveGroup = items.find((item) => item.id === 'inactive-courses');
  const hasCourses =
    (activeGroup?.children?.length ?? 0) +
      (inactiveGroup?.children?.length ?? 0) >
    0;

  if (!hasCourses) {
    return <p>No courses found.</p>;
  }

  return (
    <RichTreeView items={items} defaultExpandedItems={['active-courses']} />
  );
}
