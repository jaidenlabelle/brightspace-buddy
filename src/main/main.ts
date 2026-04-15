/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain, session } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import openLoginWindow from './brightspace/login';
import { fetchCourses, fetchCourseDescription, fetchCourseInstructors } from './brightspace/course';
import { fetchAssignments } from './brightspace/assignment';
import {
  downloadContentToCache,
  downloadAttachmentToCache,
  getCachedAssignmentData,
  getCachedContentSummary,
  summarizeContentFile,
  summarizeAttachment,
  summarizeAssignmentWithAttachments,
} from './ai';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;
let isAuthenticated = false;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

ipcMain.on('open-login-window', (event) => {
  openLoginWindow({
    onLoginSuccessful: () => {
      isAuthenticated = true;
      event.reply('login-successful');
    },
    onLoginCancelled: () => {
      event.reply('login-cancelled');
    },
  });
});

ipcMain.handle('get-auth-status', async () => {
  return isAuthenticated;
});

ipcMain.handle('get-courses', async () => {
  if (!isAuthenticated) {
    return [];
  }

  return fetchCourses();
});

ipcMain.handle('get-dashboard-data', async () => {
  if (!isAuthenticated) {
    return { courses: [], assignmentsByCourse: {} };
  }

  const courses = await fetchCourses();
  const assignmentsByCourse: Record<
    number,
    Awaited<ReturnType<typeof fetchAssignments>>
  > = {};

  await Promise.all(
    courses.map(async (course) => {
      try {
        assignmentsByCourse[course.org_unit_id] = await fetchAssignments(
          course.org_unit_id,
        );
      } catch {
        assignmentsByCourse[course.org_unit_id] = [];
      }
    }),
  );

  return {
    courses,
    assignmentsByCourse,
  };
});

ipcMain.handle('get-assignments', async (_event, courseOrgUnitId: number) => {
  if (!isAuthenticated) {
    return [];
  }

  return fetchAssignments(courseOrgUnitId);
});

ipcMain.handle('get-content', async (_event, courseOrgUnitId: number) => {
  if (!isAuthenticated) {
    return [];
  }

  const { fetchContent } = require('./brightspace/content');
  return fetchContent(courseOrgUnitId);
});

ipcMain.handle(
  'get-course-description',
  async (_event, courseOrgUnitId: number) => {
    if (!isAuthenticated) {
      return null;
    }

    return fetchCourseDescription(courseOrgUnitId);
  },
);

ipcMain.handle(
  'get-course-instructors',
  async (_event, courseOrgUnitId: number) => {
    if (!isAuthenticated) {
      return [];
    }

    return fetchCourseInstructors(courseOrgUnitId);
  },
);

ipcMain.handle(
  'summarize-content-item',
  async (_event, url: string, title: string) => {
    if (!isAuthenticated) {
      return 'You need to be logged in to summarize content files.';
    }

    if (!url) {
      return 'No file URL was provided.';
    }

    return summarizeContentFile(url, title);
  },
);

ipcMain.handle(
  'get-cached-content-summary',
  async (_event, url: string, title: string) => {
    if (!url) {
      return null;
    }

    return getCachedContentSummary(url, title);
  },
);

ipcMain.on(
  'download-content-item',
  async (_event, url: string, title?: string) => {
    if (!url) {
      return;
    }

    try {
      const cachePath = await downloadContentToCache(
        url,
        title || 'content-file',
      );
      shell.showItemInFolder(cachePath);
    } catch {
      if (mainWindow) {
        mainWindow.webContents.downloadURL(url);
        return;
      }

      session.defaultSession.downloadURL(url);
    }
  },
);

ipcMain.handle(
  'download-file-attachment',
  async (_event, url: string, fileName: string, assignmentName: string) => {
    if (!url) {
      throw new Error('No file URL provided');
    }

    if (!fileName) {
      throw new Error('No file name provided');
    }

    const cachePath = await downloadAttachmentToCache(
      url,
      fileName,
      assignmentName || 'assignment',
    );
    shell.showItemInFolder(cachePath);

    return { success: true, path: cachePath };
  },
);

ipcMain.handle(
  'summarize-file-attachment',
  async (_event, url: string, fileName: string, assignmentName: string) => {
    if (!isAuthenticated) {
      throw new Error('You need to be logged in to summarize files.');
    }

    if (!url || !fileName) {
      throw new Error('Invalid file parameters');
    }

    return summarizeAttachment(url, fileName, assignmentName);
  },
);

ipcMain.handle(
  'summarize-assignment-full',
  async (
    _event,
    assignmentName: string,
    description: string | null,
    attachmentSummaries: Array<{ fileName: string; summary: string }>,
  ) => {
    if (!isAuthenticated) {
      throw new Error('You need to be logged in to summarize assignments.');
    }

    return summarizeAssignmentWithAttachments(
      assignmentName,
      description,
      attachmentSummaries,
    );
  },
);

ipcMain.handle(
  'get-cached-assignment-summaries',
  async (
    _event,
    assignmentName: string,
    description: string | null,
    attachments: Array<{ fileName: string; url: string }>,
  ) => {
    if (!assignmentName) {
      return { attachmentSummaries: [], assignmentSummary: null };
    }

    return getCachedAssignmentData(assignmentName, description, attachments);
  },
);

ipcMain.on('logout-requested', async (event) => {
  try {
    await session.defaultSession.clearStorageData({ storages: ['cookies'] });
  } catch (error) {
    console.error('Failed to clear cookies during logout:', error);
  }

  isAuthenticated = false;
  event.reply('logout-successful');
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug').default();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    minWidth: 800,
    minHeight: 600,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    session.defaultSession.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0',
    );
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
