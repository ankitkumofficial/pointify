import {handleAdminCheckBox} from "./util.js";

const socket = io();
let session;
socket.on('alert', (msg) => {
    alert(msg);
    location.reload();
});
socket.on("sessionData", (sessionData) => {
    session = sessionData;
    if (session.username) {
        document.getElementById("preLogin").style.display = 'none';
        document.getElementById('logoutBtn').style.display = '';
        if (session.isAdmin) {
            document.getElementById('adminInfo').style.display = "block";
            document.getElementById('adminInfo').innerHTML = `<br>Your colleagues can join with team id: ${session.teamId}`;
            document.getElementById('estimationForm').style.display = '';
            document.getElementById('logoutBtn').innerText = 'Delete Team and Logout';
        }
        document.getElementById('estimationContainer').style.display = '';
    } else {
        document.getElementById("logoutBtn").style.display = 'none';
    }
});
socket.on('refresh', () => location.reload());
socket.on('logout', () => {
    if (!session.isAdmin) {
        document.getElementById('logoutBtn').click();
    }
});
socket.on('users-update', (users) => {
    if (users && users.length > 0) {
        document.getElementById('usersContainer').style.display = '';
        const ulUsers = document.getElementById('users');
        ulUsers.innerHTML = '';
        for (let i in users) {
            const li = document.createElement('li');
            li.style.setProperty("--bullet-color", "green");
            li.style.setProperty("--bullet-size", "1.25em");
            li.appendChild(document.createTextNode(`${users[i]} is online`));
            if (session.isAdmin && session.username !== users[i]) {
                const removeButton = document.createElement('button');
                removeButton.textContent = 'Remove';
                removeButton.addEventListener('click', () => socket.emit('removeUser', users[i]));
                removeButton.style.marginLeft = '20px';
                li.appendChild(removeButton);
            }
            ulUsers.appendChild(li);
        }
    }
});
socket.on('votes-update', (stories) => {
    const currentStory = stories?.find(story => story.isCurrent);
    if (currentStory) {
        document.getElementById('estimationContainer').style.display = '';
        document.getElementById('currentStoryTitle').innerText = currentStory.title;
        const ulVotes = document.getElementById('votes');
        ulVotes.style.listStyle = 'none';
        ulVotes.innerHTML = '';
        for (let username in currentStory?.votes) {
            const li = document.createElement('li');
            li.textContent = `✅ ${username} has voted `;
            ulVotes.appendChild(li);
        }
        if (session.isAdmin) {
            document.getElementById('estimationForm').style.display = 'none';
        }
    } else {
        document.getElementById('estimationContainer').style.display = 'none';
    }
});
socket.on('storyAdded', (stories) => {
    document.getElementById('estimationContainer').style.display = '';
    const currentStory = stories.find(story => story.isCurrent);
    document.getElementById('currentStoryTitle').innerText = currentStory.title;
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    socket.emit('logout', {});
});

handleAdminCheckBox();

document.getElementById('isAdminInput').addEventListener('change', () => handleAdminCheckBox());

document.getElementById('submitBtn').addEventListener('click', () => {
    const username = document.getElementById('nameInput').value;
    let teamId;
    if (!username) {
        alert('Please input your name');
        return;
    }
    const isAdmin = document.getElementById('isAdminInput').checked;
    if (isAdmin) {
        document.getElementById('adminInfo').style.display = "block";
        document.getElementById('adminInfo').innerHTML = `<br>Your colleagues can join with team id: ${teamId}`;
    } else {
        teamId = document.getElementById('teamIdInput').value;
        if (!teamId) {
            alert('Please input your teamId');
            return;
        }
    }
    socket.emit('join-team', {teamId, username, isAdmin});
});

document.getElementById('startEstimationBtn').addEventListener('click', () => {
    const storyTitle = document.getElementById('storyTitleInput').value;
    if (!storyTitle) {
        alert('Please provide story title');
        return;
    }
    socket.emit('addStory', storyTitle);
    document.getElementById('estimationForm').style.display = 'none';
    document.getElementById('estimationContainer').style.display = '';
});

export const sendVote = (value) => {
    socket.emit('vote', value);
};

window.sendVote = sendVote;
