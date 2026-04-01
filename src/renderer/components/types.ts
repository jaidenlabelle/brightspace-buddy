export type SemesterTerm = 'Winter' | 'Spring' | 'Fall';

export interface Semester {
  year: number;
  term: SemesterTerm;
}

export enum EntityDropboxStatus {
  Unsubmitted = 0,
  Submitted = 1,
  Draft = 2,
  Published = 3,
}


export interface CourseTreeItem {
  full_code: string;
  full_name: string;
  org_unit_id: number;
  name: string;
  section_number: string | null;
  ends_at: string | Date;
  is_active: boolean;
  semester: Semester;
}

export interface AssignmentTreeItem {
  name: string;
  starts_at: string | Date | null;
  ends_at: string | Date | null;
  due_at: string | Date | null;
  grade: {
    id: string;
    name: string;
    points: {
      numerator: number;
      denominator: number;
    } | null;
    weight: {
      numerator: number;
      denominator: number;
    } | null;
    comments: string;
  } | null;
  status: EntityDropboxStatus;
}

export interface ContentFileNode {
  kind: 'file';
  Id: number;
  Title: string;
  Url: string;
}

export interface ContentFolderNode {
  kind: 'folder';
  Id: number;
  Title: string;
  Children: ContentNode[];
}

export type ContentNode = ContentFileNode | ContentFolderNode;
export type ContentModuleItem = ContentFileNode;
export type ContentModule = ContentFolderNode;
