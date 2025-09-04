import fs from "fs";
import path, {dirname} from "path";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const readDb = () => JSON.parse(fs.readFileSync(path.join(__dirname, 'db', 'data.json')));

export const saveDb = (appData) => {
    let dataToSave;
    if (appData && appData.size > 0) {
        dataToSave = JSON.parse(JSON.stringify(Object.fromEntries(appData)));
        Object.keys(dataToSave).forEach(teamId => dataToSave[teamId].users = []);
        dataToSave = JSON.stringify(dataToSave);
    } else {
        dataToSave = '{}';
    }
    fs.writeFile(path.join(__dirname, 'db', 'data.json'),
        dataToSave,
        err => {
            if (err) {
                console.error('Unable to persist data');
            }
        });
};

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

export const removeUserByTeamIdAndUsername = (teamId, username, appData) => {
    const userIndex = appData.get(teamId)?.users.indexOf(username);
    appData.get(teamId)?.users.splice(userIndex, 1);
};

export const addUser = (socket, appData) => {
    const users = new Set(appData.get(socket.request.session.teamId).users);
    users.add(socket.request.session.username);
    appData.get(socket.request.session.teamId).users = [...users];
};

export const removeSession = (socket) => {
    delete socket.request.session.username;
    delete socket.request.session.teamId;
    delete socket.request.session.isAdmin;
    socket.request.session.save(err => {
        if (err) console.log(err);
    });
    socket.emit('refresh');
};
