import {
  AssignmentTreeItem,
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

export default function DetailView({
  course,
  assignment,
}: {
  course: CourseTreeItem | null;
  assignment: AssignmentTreeItem | null;
}) {
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
  const gradeDisplay = gradePoints
    ? (() => {
        const { numerator, denominator } = gradePoints;
        const fraction = `${numerator}/${denominator}`;

        if (denominator <= 0) {
          return fraction;
        }

        const percent = (numerator / denominator) * 100;
        const formattedPercent = Number.isInteger(percent)
          ? percent.toString()
          : percent.toFixed(1);

        return `${fraction} (${formattedPercent}%)`;
      })()
    : null;

  let detailContent = <p>Select a course or assignment to see details</p>;

  if (assignment) {
    detailContent = (
      <>
        <h2>{assignment.name}</h2>
        <p>Starts At: {startsAt ?? 'No start date available'}</p>
        <p>Ends At: {assignmentEndsAt ?? 'No end date available'}</p>
        <p>Due At: {dueAt ?? 'No due date available'}</p>
        <p>Grade: {gradeDisplay ?? 'No grade available'}</p>
        <p>
          Status: {getStatusLabel(assignment.status) ?? 'No status available'}
        </p>
      </>
    );
  } else if (course) {
    detailContent = (
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
    );
  }

  return <div className="detail-view">{detailContent}</div>;
}
