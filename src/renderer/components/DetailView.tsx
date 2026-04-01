import { CourseTreeItem } from './FileTree';

export default function DetailView({
  course,
}: {
  course: CourseTreeItem | null;
}) {
  const endsAt = course ? new Date(course.ends_at).toLocaleDateString() : null;

  return (
    <div className="detail-view">
      {course ? (
        <>
          <h2>{course.name}</h2>
          <p>Full Code: {course.full_code}</p>
          <p>Section: {course.section_number ?? 'No section available'}</p>
          <p>
            Semester: {course.semester.year} {course.semester.term}
          </p>
          <p>Ends At: {endsAt}</p>
          <p>Status: {course.is_active ? 'Active' : 'Inactive'}</p>
        </>
      ) : (
        <p>Select a course to see details</p>
      )}
    </div>
  );
}
