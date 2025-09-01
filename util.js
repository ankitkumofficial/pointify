import fs from "fs";
import path, {dirname} from "path";
import {fileURLToPath} from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const readDb = () => JSON.parse(fs.readFileSync(path.join(__dirname, 'db', 'data.json')));

export const saveDb = (appData) => fs.writeFile(path.join(__dirname, 'db', 'data.json'),
    JSON.stringify(Object.fromEntries(appData)),
    err => {
        if (err) {
            console.error('Unable to persist data');
        }
    });

// applicable only for non-admin users
export const teamIdNotExists = (appData, userData) => !userData.isAdmin && !appData.get(`${userData.teamId}`);

// applicable only for non-admin users
export const usernameNotAvailable = (appData, userData) => !userData.isAdmin && appData.get(`${userData.teamId}`)[userData.username];
