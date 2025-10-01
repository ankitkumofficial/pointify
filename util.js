import fs from "fs";
import path, {dirname} from "path";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const nameRegex = /^[\p{L}\p{M}'\-\s]+$/u;
const numRegex = /^\d+$/;

let writeQueue = Promise.resolve();

export const readDb = () => {
    const data = fs.readFileSync(path.join(__dirname, 'db', 'data.json'), "utf8");
    return JSON.parse(data || "{}");
};

export const saveDb = (updateFn) => {
    writeQueue = writeQueue.then(() => {
        return new Promise((resolve) => {
            const db = readDb();
            updateFn(db);
            fs.writeFile(path.join(__dirname, 'db', 'data.json'), JSON.stringify(db), err => {
                if (err) console.error(err);
            });
            resolve();
        });
    });
    return writeQueue;
};

export const usernameExists = (userData, usersCache) => usersCache[userData.teamId].find(user => user === userData.username);

export const initUser = (socket, teamData, usersCache) => {
    const session = socket.request.session;
    socket.join(session.teamId);
    socket.emit("session-data", session);
    socket.emit('users-update', usersCache[session.teamId]);
    socket.emit('votes-update', storiesWithHiddenVotesInCurrent(session.teamId, teamData, session.username));
};

export const storiesWithHiddenVotesInCurrent = (teamId, teamData, username) => {
    const estimatedStories = teamData.stories.filter(story => !story.isCurrent);
    let currentStory = teamData.stories.filter(story => story.isCurrent);
    if (currentStory?.[0]) {
        currentStory = JSON.parse(JSON.stringify(currentStory)); // remove reference from original object
        Object.keys(currentStory[0].votes).forEach(vote => vote === username || (currentStory[0].votes[vote] = 0));
    }
    return [...(estimatedStories ?? []), ...(currentStory ?? [])];
};

export const removeUser = (session, usersCache) => {
    const userIndex = usersCache[session.teamId].indexOf(session.username);
    if (userIndex > -1) {
        usersCache[session.teamId].splice(userIndex, 1);
    }
};

export const removeUserByTeamIdAndUsername = (teamId, username, usersCache) => {
    const userIndex = usersCache[teamId].indexOf(username);
    if (userIndex > -1) {
        usersCache[teamId].splice(userIndex, 1);
    }
};

export const addUserInCache = (session, usersCache) => {
    const users = new Set(usersCache[session.teamId]);
    users.add(session.username);
    usersCache[session.teamId] = [...users];
};

export const removeSession = (socket, message) => {
    delete socket.request.session.username;
    delete socket.request.session.teamId;
    delete socket.request.session.isAdmin;
    socket.request.session.save(err => {
        if (err) console.log(err);
        socket.emit('refresh', message);
    });
};

export const nearestFibonacci = (num) => {
    if (!num || isNaN(num) || num < 0) return null;
    let a = 0, b = 1;
    while (b < num) {
        [a, b] = [b, a + b];
    }
    return (num - a < b - num) ? a : b;
}

export const getValidationError = (userData) => {
    let error;
    if (!nameRegex.test(userData.username)) {
        error = "Username contains invalid characters";
    } else if (!userData.isAdmin && !numRegex.test(userData.teamId)) {
        error = "Team ID can only be a number";
    } else {
        error = null;
    }
    return error;
};
