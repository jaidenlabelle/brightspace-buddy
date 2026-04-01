import request from './brightspace';
import Route from './route';

interface ContentApiNode {
  Id: number;
  Title: string;
  Url?: string;
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

const BRIGHTSPACE_BASE_URL = 'https://brightspace.algonquincollege.com';

function normalizeBrightspaceUrl(rawUrl: string): string {
  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }

  return `${BRIGHTSPACE_BASE_URL}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
}

async function fetchNodeChildren(
  courseOrgUnitId: number,
  moduleId: number,
): Promise<ContentNode[]> {
  const response = await request(
    new Route('GET', `/d2l/api/le/1.58/${courseOrgUnitId}/content/modules/${moduleId}/structure/`),
  );

  if (!Array.isArray(response)) {
    return [];
  }

  return Promise.all(
    (response as ContentApiNode[]).map((node) => buildContentNode(courseOrgUnitId, node)),
  );
}

async function buildContentNode(
  courseOrgUnitId: number,
  node: ContentApiNode,
): Promise<ContentNode> {
  if (typeof node.Url === 'string' && node.Url.length > 0) {
    return {
      kind: 'file',
      Id: node.Id,
      Title: node.Title,
      Url: normalizeBrightspaceUrl(node.Url),
    };
  }

  return {
    kind: 'folder',
    Id: node.Id,
    Title: node.Title,
    Children: await fetchNodeChildren(courseOrgUnitId, node.Id),
  };
}

export async function fetchContent(courseOrgUnitId: number): Promise<ContentNode[]> {
  const response = await request(
    new Route('GET', `/d2l/api/le/1.58/${courseOrgUnitId}/content/root/`),
  );

  if (!Array.isArray(response)) {
    return [];
  }

  return Promise.all(
    (response as ContentApiNode[]).map((node) => buildContentNode(courseOrgUnitId, node)),
  );
}
