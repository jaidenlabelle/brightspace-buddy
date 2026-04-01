import request, { fetchAllPages } from "./brightspace";
import Route from "./route";
import { Semester, semesterFromCode, semesterFromName } from "./semester";
import { parseDate } from "./utils";

export interface Course {
  full_code: string;
  full_name: string;
  name: string;
  section_number: string | null;
  semester: Semester;
  ends_at: Date;
  is_active: boolean;
  org_unit_id: number;
}

export function courseFromString(
  courseString: string,
  orgUnitId: number
): Course {
  const match = courseString.match(
    /^(Closed, )?(..._.*?_...)? ?(.*?), (.*?), (.*?), (?:.*?) (.*)$/
  );

  if (!match) {
    throw new Error(`Invalid course string format: ${courseString}`);
  }

  const isHomeroom = match[2] == null;
  if (isHomeroom) {
    throw new Error("Homeroom courses are not supported");
  }

  const isActive = match[1] == null;
  const name = match[3];
  const fullCode = match[4];
  const semester = semesterFromName(match[5]);

  const endsAt = parseDate(match[6]);

  // Extract section number from fullCode if present (format: "CST8413_300_301" or "CST8413")
  const fullCodeParts = fullCode.split("_");
  const section_number = fullCodeParts.length > 1 ? fullCodeParts[1] : null;

  return {
    full_code: fullCode,
    full_name: courseString,
    name,
    section_number,
    semester,
    ends_at: endsAt,
    is_active: isActive,
    org_unit_id: orgUnitId,
  };
}

interface OrgUnitInfo {
  Id: number;
  Type: {
    Id: number;
    Code: string;
    Name: string;
  };
  Name: string;
  Code: string;
  HomeUrl: string;
  ImageUrl: string;
}

interface MyOrgUnitInfo {
  OrgUnit: OrgUnitInfo;
  Access: {
    IsActive: boolean;
    StartDate: string | null;
    EndDate: string | null;
    CanAccess: boolean;
    ClasslistRoleName: string | null;
    LISRoles: string[];
    LastAccessed: string | null;
  };
  PinDate: string | null;
}

function isMyOrgUnitCourseOffering(myOrgUnitInfo: MyOrgUnitInfo): boolean {
  return myOrgUnitInfo.OrgUnit.Type.Code === "Course Offering";
}

export function courseFromOrgUnitInfo(
  myOrgUnitInfo: MyOrgUnitInfo,
) : Course {
  const orgUnit = myOrgUnitInfo.OrgUnit;
  const full_name = orgUnit.Name;
  const full_code = orgUnit.Code;

  const { name, semester, section_number } = parseCourseFullName(full_name);

  const access = myOrgUnitInfo.Access;
  const ends_at = access.EndDate ? new Date(access.EndDate) : new Date(0);
  // A course is considered active if Access.IsActive is true and either there is no EndDate or the EndDate is in the future
  const is_active = access.IsActive && (!access.EndDate || new Date(access.EndDate) > new Date());

  return {
    full_code: orgUnit.Code,
    full_name: orgUnit.Name,
    name: name,
    section_number: section_number,
    semester: semester,
    ends_at: ends_at,
    is_active: is_active,
    org_unit_id: orgUnit.Id,
  }
}

function parseCourseFullName(courseFullName: string): { name: string, semester: Semester, section_number: string | null } {
  // Expected format: "25F_CST8413_300_301 Data Warehousing and Adv. Bus. Int."
  // Results in: name: "Data Warehousing and Adv. Bus. Int.", semester: "25F", section_number: "300"

  const firstSpaceIndex = courseFullName.indexOf(" ");

  if (firstSpaceIndex === -1) {
    throw new Error("Invalid course format: missing course name");
  }

  const prefix = courseFullName.slice(0, firstSpaceIndex); // "25F_CST8413_300_301"
  const name = courseFullName.slice(firstSpaceIndex + 1).trim();

  const prefixParts = prefix.split("_");
  const semester = prefixParts[0]; // "25F"
  const section_number = prefixParts.length > 2 ? prefixParts[2] : null; // "300"

  const semesterObj = semesterFromCode(semester);

  return {
    name,
    semester: semesterObj,
    section_number,
  };
}

// Get courses from brightspace rest API
export async function fetchCourses(): Promise<Course[]> {
  try {
    const response = await fetchAllPages<MyOrgUnitInfo>(new Route("GET", "/d2l/api/lp/1.58/enrollments/myenrollments/"));
    console.log("Courses fetched successfully:");

    const items: MyOrgUnitInfo[] = Array.isArray(response) ? response : [];
    const courses: Course[] = [];

    for (const item of items) {
      try {
        if (!isMyOrgUnitCourseOffering(item)) {
          console.log(`Skipping non-course org unit: ${item.OrgUnit.Name} (Type: ${item.OrgUnit.Type.Code})`);
          continue;
        }

        const course = courseFromOrgUnitInfo(item);
        //console.log(`- ${course.full_name} (ID: ${course.org_unit_id})`);

        //console.log(course);
        courses.push(course);
      } catch (error) {
        console.error(`Failed to parse course from org unit info`, item.OrgUnit, error);
      }
    }

    return courses;
  } catch (error) {
    console.error("Error in fetchCourses:", error);
    return [];
  }
}
