import request from "./brightspace";
import Route from "./route";

interface Module {
  Description: {
    Text: string;
    Html: string;
  };
  ParentModuleId: number | null;
  ModuleDueDate: string | null;
  Structure: unknown[]; // replace with a more specific type if you know the structure
  ModuleStartDate: string | null;
  ModuleEndDate: string | null;
  IsHidden: boolean;
  IsLocked: boolean;
  Id: number;
  Title: string;
  ShortTitle: string;
  Type: number;
  LastModifiedDate: string; // could also be Date if you parse it
}

interface Section {
  Name: string;
  Items: Item[];
}

interface Item {
  Id: number;
  Title: string;
}

interface ContentItem {
  Id: number;
  Title: string;
  ShortTitle: string;
  Type: number;
  LastModifiedDate: string; // could also be Date if you parse it
}

export async function fetchContent(courseOrgUnitId: number): Promise<Module[]> {
  const response = await request(new Route("GET", `/d2l/api/le/1.58/${courseOrgUnitId}/content/root/`));

  for (const module of Array.isArray(response) ? response as Module[] : []) {
    console.log(`Module: ${module.Title} (ID: ${module.Id})`);


    for (const item of module.Structure as unknown as ContentItem[]) {
      console.log(`  - Item:`, item);

    }
  }
  return response;
}
