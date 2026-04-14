import { access, mkdir, readFile, rm, writeFile } from 'fs/promises';
import { createHash } from 'crypto';
import path from 'path';
import { app } from 'electron';

const CACHE_DIR = path.join(app.getPath('userData'), 'cache');
const SUMMARIES_FILE = path.join(CACHE_DIR, 'summaries.json');
const DOWNLOADS_DIR = path.join(CACHE_DIR, 'downloads');
const DOWNLOADS_FILE = path.join(CACHE_DIR, 'downloads.json');

interface SummaryCache {
  [key: string]: {
    timestamp: number;
    summary: string;
  };
}

interface DownloadCache {
  [key: string]: {
    timestamp: number;
    filePath: string;
    sourceUrl: string;
    fileName: string;
  };
}

let summaryCache: SummaryCache | null = null;
let downloadCache: DownloadCache | null = null;

async function initializeSummaryCache(): Promise<void> {
  if (summaryCache !== null) {
    return;
  }

  try {
    await mkdir(CACHE_DIR, { recursive: true });
    const data = await readFile(SUMMARIES_FILE, 'utf-8');
    summaryCache = JSON.parse(data);
  } catch {
    summaryCache = {};
  }
}

async function initializeDownloadCache(): Promise<void> {
  if (downloadCache !== null) {
    return;
  }

  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await mkdir(DOWNLOADS_DIR, { recursive: true });
    const data = await readFile(DOWNLOADS_FILE, 'utf-8');
    downloadCache = JSON.parse(data);
  } catch {
    downloadCache = {};
  }
}

function generateCacheKey(scope: string, key: string): string {
  return createHash('sha256').update(`${scope}__${key}`).digest('hex');
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[\\/:*?"<>|]/g, '_');
}

async function persistSummaryCache(): Promise<void> {
  if (!summaryCache) {
    return;
  }

  await writeFile(
    SUMMARIES_FILE,
    JSON.stringify(summaryCache, null, 2),
    'utf-8',
  );
}

async function persistDownloadCache(): Promise<void> {
  if (!downloadCache) {
    return;
  }

  await writeFile(
    DOWNLOADS_FILE,
    JSON.stringify(downloadCache, null, 2),
    'utf-8',
  );
}

export async function getCachedSummary(
  scope: string,
  key: string,
): Promise<string | null> {
  await initializeSummaryCache();
  const cacheKey = generateCacheKey(scope, key);
  return summaryCache?.[cacheKey]?.summary || null;
}

export async function cacheSummary(
  scope: string,
  key: string,
  summary: string,
): Promise<void> {
  await initializeSummaryCache();
  const cacheKey = generateCacheKey(scope, key);

  if (summaryCache) {
    summaryCache[cacheKey] = {
      timestamp: Date.now(),
      summary,
    };

    await persistSummaryCache();
  }
}

export async function getCachedDownloadPath(
  scope: string,
  key: string,
): Promise<string | null> {
  await initializeDownloadCache();
  const cacheKey = generateCacheKey(scope, key);
  const entry = downloadCache?.[cacheKey];

  if (!entry) {
    return null;
  }

  try {
    await access(entry.filePath);
    return entry.filePath;
  } catch {
    if (downloadCache) {
      delete downloadCache[cacheKey];
      await persistDownloadCache();
    }
    return null;
  }
}

export async function cacheDownload(
  scope: string,
  key: string,
  fileName: string,
  sourceUrl: string,
  bytes: Buffer,
): Promise<string> {
  await initializeDownloadCache();
  await mkdir(DOWNLOADS_DIR, { recursive: true });

  const cacheKey = generateCacheKey(scope, key);
  const safeFileName = sanitizeFileName(fileName || 'downloaded-file');
  const cacheFilePath = path.join(DOWNLOADS_DIR, `${cacheKey}-${safeFileName}`);

  await writeFile(cacheFilePath, bytes);

  if (downloadCache) {
    downloadCache[cacheKey] = {
      timestamp: Date.now(),
      filePath: cacheFilePath,
      sourceUrl,
      fileName: safeFileName,
    };

    await persistDownloadCache();
  }

  return cacheFilePath;
}

export async function clearCache(): Promise<void> {
  await initializeSummaryCache();
  await initializeDownloadCache();
  summaryCache = {};
  downloadCache = {};
  await writeFile(SUMMARIES_FILE, JSON.stringify({}), 'utf-8');
  await writeFile(DOWNLOADS_FILE, JSON.stringify({}), 'utf-8');
  await rm(DOWNLOADS_DIR, { recursive: true, force: true });
}
