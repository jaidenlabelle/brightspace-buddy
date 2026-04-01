import { BrowserWindow } from 'electron';
import { fetchCourses } from './course';
import { fetchAssignments } from './assignment';
import { fetchGrades } from './grade';

type LoginWindowCallbacks = {
  onLoginSuccessful: () => void;
  onLoginCancelled: () => void;
};

export default function openLoginWindow({
  onLoginSuccessful,
  onLoginCancelled,
}: LoginWindowCallbacks) {
  const loginWindow = new BrowserWindow({
    width: 500,
    height: 600,
  });
  let loginCompleted = false;

  loginWindow.loadURL('https://brightspace.algonquincollege.com/');

  console.log('Login window opened.');

  loginWindow.on('closed', () => {
    console.log('Login window closed.');
    if (!loginCompleted) {
      onLoginCancelled();
    }
  });

  // Check if url contains brightspace.algonquincollege.com/d2l/home
  loginWindow.webContents.on('did-navigate', async (event, url) => {
    console.log('Navigated to URL:', url);
    if (url.includes('brightspace.algonquincollege.com/d2l/home')) {
      console.log('Detected successful login. Closing login window.');

      // fetchCourses().catch((error) => {
      //   console.error('Error fetching courses after login:', error);
      // });

      // fetchAssignments(847673).catch((error) => {
      //   console.error('Error fetching assignments after login:', error);
      // });

      fetchGrades(847673).catch((error) => {
        console.error('Error fetching grades after login:', error);
      });

      loginCompleted = true;
      onLoginSuccessful();
      loginWindow.close();
    }
  });
}
