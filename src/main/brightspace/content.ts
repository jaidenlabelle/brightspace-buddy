import request from './brightspace';
import Route from './route';

interface RootContentModule {
  Id: number;
  Title: string;
  Structure: unknown[];
}

export interface ContentModuleItem {
  Id: number;
  Title: string;
  Url: string;
}

export interface ContentModule {
  Id: number;
  Title: string;
  Structure: ContentModuleItem[];
}

export async function fetchContent(courseOrgUnitId: number): Promise<ContentModule[]> {
  const response = await request(
    new Route('GET', `/d2l/api/le/1.58/${courseOrgUnitId}/content/root/`),
  );

  if (!Array.isArray(response)) {
    throw new Error('Unexpected API response format: expected an array of content modules');
  }

  for (const module of response) {
    // Get structure for each module
    const structureResponse = await request(
      new Route('GET', `/d2l/api/le/1.58/${courseOrgUnitId}/content/modules/${module.Id}/structure/`),
    );

    module.Structure = structureResponse;

    // Set URL for each item in the structure
    if (Array.isArray(module.Structure)) {
      for (const item of module.Structure) {
        if (typeof item.Url === 'string') {
          item.Url = "https://brightspace.algonquincollege.com" + item.Url;
        } else {
          console.warn(`Unexpected item format in content module structure:`, item);
        }
      }
    }
  }

  return response as ContentModule[];
}
