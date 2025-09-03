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

export const initUser = (socket, appData) => {
    socket.join(socket.request.session.teamId);
    socket.emit("sessionData", socket.request.session);
    socket.emit('users-update', appData.get(socket.request.session.teamId)?.users);
    const estimatedStories = appData.get(socket.request.session.teamId)?.stories.filter(story => !story.isCurrent);
    const currentStory = appData.get(socket.request.session.teamId)?.stories.filter(story => story.isCurrent);
    if (currentStory?.[0]) {
        // hide current votes
        Object.keys(currentStory[0].votes).forEach(vote => currentStory[0].votes[vote] = 0);
    }
    socket.emit('votes-update', [...(estimatedStories ?? []), ...(currentStory ?? [])]);
};

export const removeUser = (socket, appData) => {
    const userIndex = appData.get(socket.request.session.teamId)?.users.indexOf(socket.request.session.username);
    appData.get(socket.request.session.teamId)?.users.splice(userIndex, 1);
};

export const addUser = (socket, appData) => {
    const users = new Set(appData.get(socket.request.session.teamId).users);
    users.add(socket.request.session.username);
    appData.get(socket.request.session.teamId).users = [...users];
};
