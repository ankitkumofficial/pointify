import fs from "fs";
import path, {dirname} from "path";
import {fileURLToPath} from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const readDb = () => JSON.parse(fs.readFileSync(path.join(__dirname, 'db', 'data.json')));

export const saveDb = (appData) => fs.writeFile(path.join(__dirname, 'db', 'data.json'),
    appData && appData.size > 0 ? JSON.stringify(Object.fromEntries(appData)) : '{}',
    err => {
        if (err) {
            console.error('Unable to persist data');
        }
    });

export const usernameExists = (appData, userData) => appData.get(`${userData.teamId}`).users.find(user => user === userData.username);
