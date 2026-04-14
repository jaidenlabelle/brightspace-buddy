import { session } from 'electron';
import { createHash } from 'crypto';
import path from 'path';
import { LMStudioClient } from '@lmstudio/sdk';
import {
  cacheDownload,
  cacheSummary,
  getCachedDownloadPath,
  getCachedSummary,
} from './cache';

const LM_STUDIO_BASE_URL = 'ws://192.168.0.12:1234';
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

function getCacheIdentity(url: string, suggestedName: string): string {
  return createHash('sha256').update(`${url}__${suggestedName}`).digest('hex');
}

function getSummaryCacheIdentity(
  assignmentName: string,
  description: string | null,
  attachmentSummaries: Array<{ fileName: string; summary: string }>,
): string {
  const normalizedAttachments = [...attachmentSummaries]
    .sort((a, b) => a.fileName.localeCompare(b.fileName))
    .map((item) => ({
      fileName: item.fileName,
      summary: item.summary.trim(),
    }));

  return createHash('sha256')
    .update(
      JSON.stringify({
        assignmentName,
        description: description?.trim() ?? '',
        attachments: normalizedAttachments,
      }),
    )
    .digest('hex');
}

async function fetchAndCacheFile(
  url: string,
  suggestedName: string,
  scope: string,
  key: string,
): Promise<string> {
  const cachedPath = await getCachedDownloadPath(scope, key);
  if (cachedPath) {
    return cachedPath;
  }

  const { d2lSecureSessionVal, d2lSessionVal } = await getBrightspaceCookies();
  const response = await fetch(url, {
    headers: {
      Cookie: `d2lSecureSessionVal=${d2lSecureSessionVal}; d2lSessionVal=${d2lSessionVal}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch content file: ${response.status} ${response.statusText}`,
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  const bytes = await response.arrayBuffer();

  let resolvedFileName = sanitizeFileName(suggestedName || 'content-file');
  if (!path.extname(resolvedFileName)) {
    if (contentType.includes('pdf')) {
      resolvedFileName = `${resolvedFileName}.pdf`;
    } else if (contentType.includes('wordprocessingml')) {
      resolvedFileName = `${resolvedFileName}.docx`;
    } else if (contentType.includes('msword')) {
      resolvedFileName = `${resolvedFileName}.doc`;
    } else if (contentType.includes('presentationml')) {
      resolvedFileName = `${resolvedFileName}.pptx`;
    } else if (contentType.includes('officedocument.spreadsheetml')) {
      resolvedFileName = `${resolvedFileName}.xlsx`;
    } else if (contentType.includes('text/plain')) {
      resolvedFileName = `${resolvedFileName}.txt`;
    }
  }

  return cacheDownload(scope, key, resolvedFileName, url, Buffer.from(bytes));
}

async function summarizeFileAtPath(filePath: string): Promise<string> {
  const client = new LMStudioClient({
    baseUrl: LM_STUDIO_BASE_URL,
  });

  const model = await client.llm.model(LM_STUDIO_MODEL);
  const fileHandle = await client.files.prepareFile(filePath);
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
}

export async function downloadContentToCache(
  url: string,
  title: string,
): Promise<string> {
  const cacheId = getCacheIdentity(url, title);
  return fetchAndCacheFile(url, title, 'content-download', cacheId);
}

export async function summarizeContentFile(
  url: string,
  title: string,
): Promise<string> {
  const cacheId = getCacheIdentity(url, title);
  const cachedSummary = await getCachedSummary('content-summary', cacheId);
  if (cachedSummary) {
    return cachedSummary;
  }

  const downloadedPath = await downloadContentToCache(url, title);

  const summary = await summarizeFileAtPath(downloadedPath);
  await cacheSummary('content-summary', cacheId, summary);
  return summary;
}

export async function downloadAttachmentToCache(
  url: string,
  fileName: string,
  assignmentName: string,
): Promise<string> {
  const cacheId = getCacheIdentity(url, `${assignmentName}__${fileName}`);
  return fetchAndCacheFile(url, fileName, 'attachment-download', cacheId);
}

export async function summarizeAttachment(
  url: string,
  fileName: string,
  assignmentName: string,
): Promise<string> {
  const cacheId = getCacheIdentity(url, `${assignmentName}__${fileName}`);
  const cached = await getCachedSummary('attachment-summary', cacheId);
  if (cached) {
    return cached;
  }

  const downloadedPath = await downloadAttachmentToCache(
    url,
    fileName,
    assignmentName,
  );
  const summary = await summarizeFileAtPath(downloadedPath);

  await cacheSummary('attachment-summary', cacheId, summary);

  return summary;
}

export async function summarizeAssignmentWithAttachments(
  assignmentName: string,
  description: string | null,
  attachmentSummaries: Array<{ fileName: string; summary: string }>,
): Promise<string> {
  const summaryCacheId = getSummaryCacheIdentity(
    assignmentName,
    description,
    attachmentSummaries,
  );
  const cachedSummary = await getCachedSummary(
    'assignment-summary',
    summaryCacheId,
  );
  if (cachedSummary) {
    return cachedSummary;
  }

  const client = new LMStudioClient({
    baseUrl: LM_STUDIO_BASE_URL,
  });

  const model = await client.llm.model(LM_STUDIO_MODEL);

  const attachmentSection = attachmentSummaries
    .map((att) => `${att.fileName}: ${att.summary}`)
    .join('\n\n');

  const content =
    description && description.trim()
      ? `Assignment Description:\n${description}\n\nAttachment Summaries:\n${attachmentSection}`
      : `Attachment Summaries:\n${attachmentSection}`;

  const result = await model.respond([
    {
      role: 'user',
      content:
        'Synthesize the following assignment details (description and attachment summaries) into a comprehensive summary of the entire assignment in 200-300 words. Focus on the key requirements, deadlines, and important details.',
    },
    { role: 'user', content },
  ]);

  await cacheSummary(
    'assignment-summary',
    summaryCacheId,
    result.nonReasoningContent,
  );
  return result.nonReasoningContent;
}
