import { BrowserWindow } from 'electron';

export default function openLoginWindow(onLoginSuccessful: () => void) {
  const loginWindow = new BrowserWindow({
    width: 500,
    height: 600,
  });

  loginWindow.loadURL('https://brightspace.algonquincollege.com/');

  console.log('Login window opened.');

  loginWindow.on('closed', () => {
    console.log('Login window closed.');
  });

  // Check if url contains brightspace.algonquincollege.com/d2l/home
  loginWindow.webContents.on('did-navigate', (event, url) => {
    console.log('Navigated to URL:', url);
    if (url.includes('brightspace.algonquincollege.com/d2l/home')) {
      console.log('Detected successful login. Closing login window.');
      onLoginSuccessful();
      loginWindow.close();
    }
  });
}
