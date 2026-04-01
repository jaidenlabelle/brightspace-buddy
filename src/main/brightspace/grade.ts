import request from "./brightspace";
import { Fraction } from "./fraction";
import Route from "./route";

export interface GradeValue {
  DisplayedGrade: string;
  GradeObjectIdentifier: string;
  GradeObjectName: string;
  GradeObjectType: string;
  GradeObjectTypeName: string | null;
  Comments: {
    Text: string;
    Html: string;
  };
  PrivateComments: {
    Text: string;
    Html: string;
  };
  LastModified: Date | null;
  LastModifiedBy: string | null;
  ReleaseDate: Date | null;

  // Computable
  PointsNumerator: number | null;
  PointsDenominator: number | null;
  WeightedDenominator: number | null;
  WeightedNumerator: number | null;

  // Bulk
  UserId: number;
  OrgUnitId: number;
}

export interface Grade {
  id: string;
  name: string;
  points: Fraction | null;
  weight: Fraction | null;
  comments: string;
}

function gradeFromGradeValue(gradeValue: GradeValue): Grade {
  const points = (gradeValue.PointsNumerator !== null && gradeValue.PointsDenominator !== null)
    ? new Fraction(gradeValue.PointsNumerator, gradeValue.PointsDenominator)
    : null;

  const weight = (gradeValue.WeightedNumerator !== null && gradeValue.WeightedDenominator !== null)
    ? new Fraction(gradeValue.WeightedNumerator, gradeValue.WeightedDenominator)
    : null;

  // Convert HTML comments to plain text
  const comments = htmlToText(gradeValue.Comments.Html);

  return {
    id: gradeValue.GradeObjectIdentifier,
    name: gradeValue.GradeObjectName,
    points,
    weight,
    comments: comments,
  };
}

export async function fetchGrades(courseOrgUnitId: number): Promise<Grade[]> {
  const response = await request(new Route("GET", `/d2l/api/le/1.58/${courseOrgUnitId}/grades/values/myGradeValues/`));

  console.log("Grades API response:", response);

  const gradeValues = Array.isArray(response)    ? response
    : Array.isArray(response?.Objects)
      ? response.Objects
      : Array.isArray(response?.Items)
        ? response.Items
        : [];

  return gradeValues.map((gradeValue: GradeValue) => {
    //console.debug("Processing grade value:", gradeValue);
    const grade = gradeFromGradeValue(gradeValue);
    //console.debug("Converted grade:", grade);
    return grade;
  });
}

export async function fetchGrade(courseOrgUnitId: number, gradeObjectIdentifier: string): Promise<Grade | null> {
  const response = await request(new Route("GET", `/d2l/api/le/1.58/${courseOrgUnitId}/grades/${gradeObjectIdentifier}/values/myGradeValue`));

  //console.log("Single Grade API response:", response);

  if (!response || typeof response !== 'object') {
    console.warn("Unexpected API response format for single grade:", response);
    return null;
  }

  return gradeFromGradeValue(response as GradeValue);
}

/**
 * Utility function to convert HTML content to plain text. This is used to extract readable comments from the GradeValue's Comments.Html field.
 * @param html The HTML string to convert to plain text.
 * @returns A plain text representation of the input HTML string.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

