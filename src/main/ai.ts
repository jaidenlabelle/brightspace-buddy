import { mkdir, rm, writeFile } from 'fs/promises';
import path from 'path';
import os from 'os';
import { session } from 'electron';
import { LMStudioClient } from '@lmstudio/sdk';

const LM_STUDIO_BASE_URL = 'ws://24.246.0.21:1234';
const LM_STUDIO_MODEL = 'qwen3.5-9b-uncensored-hauhaucs-aggressive';
const BRIGHTSPACE_BASE_URL = 'https://brightspace.algonquincollege.com';

async function getBrightspaceCookies() {
  const cookies = await session.defaultSession.cookies.get({
    url: BRIGHTSPACE_BASE_URL,
  });

  const d2lSecureSessionVal = cookies.find(
    (cookie) => cookie.name === 'd2lSecureSessionVal',
  )?.value;
  const d2lSessionVal = cookies.find(
    (cookie) => cookie.name === 'd2lSessionVal',
  )?.value;

  if (!d2lSecureSessionVal || !d2lSessionVal) {
    throw new Error('Required cookies not found');
  }

  return { d2lSecureSessionVal, d2lSessionVal };
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[\\/:*?"<>|]/g, '_');
}

async function downloadFileToTemp(url: string, suggestedName: string): Promise<string> {
  const { d2lSecureSessionVal, d2lSessionVal } = await getBrightspaceCookies();
  const response = await fetch(url, {
    headers: {
      Cookie: `d2lSecureSessionVal=${d2lSecureSessionVal}; d2lSessionVal=${d2lSessionVal}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch content file: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type');
  const extension = contentType?.includes('pdf') ? '.pdf' : '';
  const tempDir = path.join(os.tmpdir(), 'brightspace-buddy');
  await mkdir(tempDir, { recursive: true });

  const safeName = sanitizeFileName(suggestedName || 'content-file');
  const tempPath = path.join(tempDir, `${Date.now()}-${safeName}${extension}`);
  const bytes = await response.arrayBuffer();

  await writeFile(tempPath, Buffer.from(bytes));
  return tempPath;
}

export async function summarizeContentFile(url: string, title: string): Promise<string> {
  const downloadedPath = await downloadFileToTemp(url, title);

  try {
    const client = new LMStudioClient({
      baseUrl: LM_STUDIO_BASE_URL,
    });

    const model = await client.llm.model(LM_STUDIO_MODEL);
    const fileHandle = await client.files.prepareFile(downloadedPath);
    const parsedDocument = await client.files.parseDocument(fileHandle, {
      onParserLoaded: (parser) => {
        console.log(`Using parser: ${parser.library} v${parser.version}`);
      },
      onProgress: (progress) => {
        console.log(`Parsing: ${Math.round(progress * 100)}%`);
      },
    });

    const result = await model.respond([
      {
        role: 'user',
        content:
          'Summarize this content file in a concise paragraph under 150 words. Focus on the main ideas and important details.',
      },
      { role: 'user', content: parsedDocument.content },
    ]);

    return result.nonReasoningContent;
  } finally {
    await rm(downloadedPath, { force: true });
  }
}
