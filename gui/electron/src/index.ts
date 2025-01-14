import { app, BrowserWindow, dialog, } from 'electron';
import path from 'path/posix';
import fs from 'fs';
import dotenv from 'dotenv';
import express from 'express';
import { Console } from 'console';
import json from '../../../package.json';


process.on('uncaughtException', (er, or) => {
  console.error(er, or);
});

process.on('unhandledRejection', (er, pr) => {
  console.log(er, pr);
});

const getDataDirectory = () => {
  switch (process.platform) {
  case 'darwin': {
    if (!process.env.HOME) {
      console.error('Unknown home directory');
      process.exit(1);
    }
    return path.join(process.env.HOME, 'Library', 'Application Support', json.name);
  }
  case 'win32': {
    if (!process.env.APPDATA) {
      console.error('Unknown home directory');
      process.exit(1);
    }
    console.log('Appdata', process.env.APPDATA);
    return path.join(process.env.APPDATA, json.name);
  }
  case 'linux': {
    if (!process.env.HOME) {
      console.error('Unknown home directory');
      process.exit(1);
    }
    return path.join(process.env.HOME, `.${json.name}`);
  }
  default: {
    console.error('Unsupported platform!');
    process.exit(1);
  }  
  }
};
if (!fs.existsSync(getDataDirectory()))
  fs.mkdirSync(getDataDirectory());

export { getDataDirectory };
process.env.contentDirectory = getDataDirectory();

import './menu';


if (fs.existsSync(path.join(__dirname, '.env')))
  dotenv.config({ path: path.join(__dirname, '.env'), debug: true });

if (require('electron-squirrel-startup')) {
  app.quit();
}

export const isWindows = process.platform === 'win32';

let mainWindow: BrowserWindow|undefined = undefined;
export { mainWindow };

const icon = path.join(__dirname, 'images', `Logo_Inverted.${isWindows ? 'ico' : 'png'}`);

if (!process.env.TEST) {
  // eslint-disable-next-line no-global-assign
  console = (() => {
    const logFolder = path.join(getDataDirectory(), 'logs');
    if (!fs.existsSync(logFolder))
      fs.mkdirSync(logFolder);
    if (fs.existsSync(path.join(logFolder, 'latest.log')))
      fs.renameSync(path.join(logFolder, 'latest.log'), path.join(logFolder, `${Date.now()}.log`));
    return new Console(fs.createWriteStream(path.join(logFolder, 'latest.log')));
  })();
}

const createWindow = async () => {
  
  // Create the browser window.
  mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    title: 'AniDL GUI BETA',
    webPreferences: {
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon,
  });

  mainWindow.webContents.on('crashed', (e) => console.log(e));

  if (!process.env.TEST) {
    const response = dialog.showMessageBoxSync(mainWindow, {
      title: 'Test Version Information',
      message: 'I understand that this is a test version that is subject to changes and most certainly contains errors.' 
        + '\nI understand that I am using this tool at my own risk.'
        + '\nI know that bugs or suggestions should be made to Izuco on Discord or under github@izuco.dev'
        + '\nI understand that I should thank Darekon for the art works and the concept art if I see him',
      buttons: [
        'Cancel',
        'I understand'
      ],
      type: 'info'
    });
    console.log(`[INFO] Popup response: ${response}`);
    if (response !== 1 && response !== -1)
      app.quit();
  }

  (await import('./messageHandler')).default(mainWindow);
  
  if (!process.env.USE_BROWSER) {
    const app = express();

    // Path.sep seems to return / on windows with electron 
    // \\ in Filename on Linux is possible but I don't see another way rn
    const sep = isWindows ? '\\' : '/';

    const p = __dirname.split(sep);
    p.pop();
    p.push('build');

    console.log(p.join(sep));

    app.use(express.static(p.join(sep)));

    await new Promise((resolve) => {
      app.listen(3000, () => {
        console.log('Express started');
        resolve(undefined);
      });
    });

  }
  
  mainWindow.loadURL('http://localhost:3000');
  if (process.env.TEST)
    mainWindow.webContents.openDevTools();
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  process.exit(0);
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});