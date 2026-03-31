import { BrowserWindow } from 'electron';

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
  loginWindow.webContents.on('did-navigate', (event, url) => {
    console.log('Navigated to URL:', url);
    if (url.includes('brightspace.algonquincollege.com/d2l/home')) {
      console.log('Detected successful login. Closing login window.');
      loginCompleted = true;
      onLoginSuccessful();
      loginWindow.close();
    }
  });
}
