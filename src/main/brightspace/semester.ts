export const TERMS = {
  W: "Winter",
  S: "Spring",
  F: "Fall",
} as const;

export type TermCode = keyof typeof TERMS;     // "W" | "S" | "F"
export type TermName = typeof TERMS[TermCode]; // "Winter" | "Spring" | "Fall"

export interface Semester {
  year: number;
  term: TermName;
}


export function semesterName(semester: Semester): string {
  return `${semester.year} ${semester.term}`;
}

export function semesterCode(semester: Semester): string {
  const termMap: Record<TermName, TermCode> = {
    Winter: "W",
    Spring: "S",
    Fall: "F",
  };

  const yearSuffix = String(semester.year).slice(-2);
  const termChar = termMap[semester.term];

  return `${yearSuffix}${termChar}`;
}

export function semesterFromName(name: string): Semester {
  const parts = name.split(" ");

  if (parts.length !== 2) {
    throw new Error(`Invalid semester name format: ${name}`);
  }

  const year = Number(parts[0]);
  const term = parts[1] as TermName;

  if (!Number.isInteger(year) || year < 0) {
    throw new Error(`Year must be a positive integer, got: ${year}`);
  }

  if (!Object.values(TERMS).includes(term)) {
    throw new Error(`Invalid term: ${term}`);
  }

  return { year, term };
}

export function semesterFromCode(code: string): Semester {
  if (code.length !== 3) {
    throw new Error(`Invalid semester code format: ${code}`);
  }

  const yearStr = code.slice(0, 2);
  const termChar = code[2] as TermCode;

  if (!(termChar in TERMS)) {
    throw new Error(`Unknown semester term character: ${termChar}`);
  }

  const year = 2000 + Number(yearStr);
  const term = TERMS[termChar];

  return { year, term };
}
