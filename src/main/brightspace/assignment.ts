import request from './brightspace';
import { fetchGrade, Grade, htmlToText } from './grade';
import Route from './route';

export interface Assignment {
  name: string;
  description: string | null;

  starts_at: Date | null;
  ends_at: Date | null;
  due_at: Date | null;

  grade: Grade | null;
  fileAttachments: FileAttachment[];
  linkAttachments: LinkAttachment[];

  status: EntityDropboxStatus;
}

export enum EntityDropboxStatus {
  Unsubmitted = 0,
  Submitted = 1,
  Draft = 2,
  Published = 3,
}

export function getStatusLabel(status: EntityDropboxStatus): string {
  switch (status) {
    case EntityDropboxStatus.Unsubmitted:
      return 'Unsubmitted';
    case EntityDropboxStatus.Submitted:
      return 'Submitted';
    case EntityDropboxStatus.Draft:
      return 'Draft';
    case EntityDropboxStatus.Published:
      return 'Published';
    default:
      return 'Unknown';
  }
}

export interface FileAttachment {
  FileId: number;
  FileName: string;
  Size: number;
}

export interface LinkAttachment {
  LinkId: number;
  LinkName: string;
  Href: string;
}

export interface Availability {
  StartDate: string | null;
  EndDate: string | null;
  StartDateAvailabilityType: string | null;
  EndDateAvailabilityType: string | null;
}

export interface Assessment {
  ScoreDenominator: number | null;
  Rubrics: Rubric[];
}

// Placeholder since structure wasn't expanded in your schema
export interface Rubric {
  [key: string]: any;
}

export interface DropboxFolder {
  Id: number;
  CategoryId: number | null;
  Name: string;
  CustomInstructions: any; // RichText composite (replace with proper type if known)
  Attachments: FileAttachment[];
  TotalFiles: number;
  UnreadFiles: number;
  FlaggedFiles: number;
  TotalUsers: number;
  TotalUsersWithSubmissions: number;
  TotalUsersWithFeedback: number;
  Availability: Availability | null;
  GroupTypeId: number | null;
  DueDate: string | null;
  DisplayInCalendar: boolean;
  Assessment: Assessment;
  NotificationEmail: string | null;
  IsHidden: boolean;
  LinkAttachments: LinkAttachment[];
  ActivityId: string | null;
  IsAnonymous: boolean;
  DropboxType: string;
  SubmissionType: string;
  CompletionType: string;
  GradeItemId: number | null;
  AllowOnlyUsersWithSpecialAccess: boolean | null;
}

async function assignmentFromDropboxFolder(
  courseOrgUnitId: number,
  folder: DropboxFolder,
): Promise<Assignment> {
  let grade: Grade | null = null;
  let status: EntityDropboxStatus | null = null;

  if (typeof folder.GradeItemId === 'number') {
    try {
      grade = await fetchGrade(courseOrgUnitId, String(folder.GradeItemId));
    } catch {
      grade = null;
    }
  }

  try {
    const submissions = await fetchAssignmentSubmissions(
      courseOrgUnitId,
      folder.Id,
    );
    status = submissions[0]?.Status;
    //console.log(`Fetched submissions for folder ${folder.Id}, status: ${status}`, submissions);
  } catch {
    status = null;
  }

  // Extract description from CustomInstructions
  let description: string | null = null;
  if (folder.CustomInstructions) {
    if (typeof folder.CustomInstructions === 'string') {
      description = folder.CustomInstructions;
    } else if (typeof folder.CustomInstructions === 'object') {
      if (folder.CustomInstructions.Html) {
        description = htmlToText(folder.CustomInstructions.Html);
      } else if (folder.CustomInstructions.Text) {
        description = folder.CustomInstructions.Text;
      }
    }
  }

  //console.log(folder);

  return {
    name: folder.Name,
    description,
    starts_at: folder.Availability?.StartDate
      ? new Date(folder.Availability.StartDate)
      : null,
    ends_at: folder.Availability?.EndDate
      ? new Date(folder.Availability.EndDate)
      : null,
    due_at: folder.DueDate ? new Date(folder.DueDate) : null,
    status: status ?? 0, // Default to 0 if status is null
    grade: grade,
    fileAttachments: folder.Attachments ?? [],
    linkAttachments: folder.LinkAttachments ?? [],
  };
}

function fetchAssignmentSubmissions(courseOrgUnitId: number, folderId: number) {
  return request(
    new Route(
      'GET',
      `/d2l/api/le/1.58/${courseOrgUnitId}/dropbox/folders/${folderId}/submissions/`,
    ),
  );
}

export async function fetchAssignments(
  courseOrgUnitId: number,
): Promise<Assignment[]> {
  const response = await request(
    new Route('GET', `/d2l/api/le/1.58/${courseOrgUnitId}/dropbox/folders/`),
  );

  // console.debug("Assignments API response:", response);
  const folders = Array.isArray(response)
    ? response
    : Array.isArray(response?.Objects)
      ? response.Objects
      : Array.isArray(response?.Items)
        ? response.Items
        : [];

  const assignments = await Promise.all(
    folders.map(async (folder: DropboxFolder) => {
      try {
        return await assignmentFromDropboxFolder(courseOrgUnitId, folder);
      } catch {
        return null;
      }
    }),
  );

  return assignments.filter(
    (assignment): assignment is Assignment => assignment !== null,
  );
}
