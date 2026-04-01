import request from "./brightspace";
import type { Fraction } from "./fraction";
import Route from "./route";

export interface Assignment {
  name: string;

  starts_at: Date | null;
  ends_at: Date | null;
  due_at: Date | null;

  score: Fraction | null;

  completion_status: string | null;
  evaluation_status: string | null;
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

function assignmentFromDropboxFolder(folder: DropboxFolder): Assignment {
  return {
    name: folder.Name,
    starts_at: folder.Availability?.StartDate ? new Date(folder.Availability.StartDate) : null,
    ends_at: folder.Availability?.EndDate ? new Date(folder.Availability.EndDate) : null,
    due_at: folder.DueDate ? new Date(folder.DueDate) : null,
    completion_status: null, // Placeholder, as this info isn't in the current schema
    evaluation_status: null,
    score: null
  };
}

export async function fetchAssignments(courseOrgUnitId: number): Promise<Assignment[]> {
  const response = await request(new Route("GET", `/d2l/api/le/1.58/${courseOrgUnitId}/dropbox/folders/`));

  console.log("Assignments API response:", response);
  const folders = Array.isArray(response)
    ? response
    : Array.isArray(response?.Objects)
      ? response.Objects
      : Array.isArray(response?.Items)
        ? response.Items
        : [];

  return folders.map((folder: DropboxFolder) => {
    console.log("Processing folder:", folder);
    return assignmentFromDropboxFolder(folder);
  });
}
