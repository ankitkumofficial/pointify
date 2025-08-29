import {handleAdminCheckBox} from "./util.js";

const socket = io();
let session;
socket.on("sessionData", (sessionData) => {
    session = sessionData;
    if (session.username) {
        document.getElementById("preLogin").style.display = 'none';
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
socket.on('votes-update', (stories) => {
    const currentStory = stories?.find(story => story.isCurrent);
    if (currentStory) {
        document.getElementById('estimationContainer').style.display = '';
        document.getElementById('currentStoryTitle').innerText = currentStory.title;
        const ul = document.getElementById('votes');
        ul.innerHTML = '';
        for (let username in currentStory?.votes) {
            const li = document.createElement('li');
            li.textContent = `${username}: ${currentStory.votes[username]}`;
            ul.appendChild(li);
        }
        if (session.isAdmin) {
            document.getElementById('estimationForm').style.display = 'none';
        }
    } else {
        document.getElementById('estimationContainer').style.display = 'none';
    }
});
socket.on('storyAdded', (stories) => {
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
        teamId = Math.floor(1000 + Math.random() * 9000);
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
    document.getElementById('logoutBtn').style.display = "";
    if (isAdmin) {
        document.getElementById('logoutBtn').innerText = "Delete Team and Logout";
        document.getElementById('estimationForm').style.display = '';
    }
    document.getElementById('preLogin').style.display = "none";
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
