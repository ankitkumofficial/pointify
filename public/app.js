import {handleAdminCheckBox, showPopup} from "./util.js";

const socket = io();
let session;
socket.on('alert', (msg) => {
    showPopup(msg);
});
socket.on("sessionData", (sessionData) => {
    session = sessionData;
    initPage();
});
socket.on("init", () => initPage());
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
        ulUsers.style.listStyle = 'none';
        ulUsers.innerHTML = '';
        for (let i in users) {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.alignItems = 'center';
            li.style.gap = '0.5rem';
            li.style.padding = '0.25rem 0';
            li.innerHTML += `<svg width="1rem" height="1rem" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg"><circle id="Oval" cx="11" cy="11" r="5.10714286" fill="#108548"></circle></svg><span>${users[i]} is online</span>`;
            if (session.isAdmin && session.username !== users[i]) {
                const removeButton = document.createElement('button');
                removeButton.textContent = 'Remove';
                removeButton.addEventListener('click', () => socket.emit('removeUser', users[i]));
                li.appendChild(removeButton);
            }
            ulUsers.appendChild(li);
        }
    }
});
socket.on('votes-update', (stories) => {
    document.getElementById('estimatedContainer').style.display = '';
    const estimatedStories = stories?.filter(story => !story.isCurrent);
    document.getElementById('estimatedStories').textContent = '';
    if (estimatedStories && estimatedStories.length > 0) {
        let story;
        for (let i = estimatedStories.length - 1; i >= 0; i--) {
            story = estimatedStories[i];
            const estimatedStoryElem = document.createElement('p');
            estimatedStoryElem.append(`Story: ${story.title}`);
            estimatedStoryElem.innerHTML += '<br>';
            estimatedStoryElem.append('Votes: ');
            const concatenatedVotes = Object.keys(story.votes)
                .map(username => `${username}: ${story.votes[username] ? story.votes[username] : '?'}`)
                .join(', ');
            estimatedStoryElem.append(concatenatedVotes || 'No one voted');
            estimatedStoryElem.innerHTML += '<br>';
            estimatedStoryElem.append(`Average: ${story.average || 'Not available'}, Recommended: ${story.suggested || 'Not available'}`);
            document.getElementById('estimatedStories').appendChild(estimatedStoryElem);
            if (i > 0) {
                document.getElementById('estimatedStories').innerHTML +=
                    '<hr style="border:0;height:0.0625rem;background:currentColor;opacity:.2;margin: 0.25em 0">';
            }
        }
    } else {
        const estimatedStoryElem = document.createElement('p');
        estimatedStoryElem.innerText = 'No stories have been estimated yet.';
        document.getElementById('estimatedStories').appendChild(estimatedStoryElem);
    }
    const currentStory = stories?.find(story => story.isCurrent);
    if (currentStory) {
        if (!session.isAdmin) {
            document.getElementById('finishEstimationContainer').style.display = 'none';
        }
        document.getElementById('estimationContainer').style.display = '';
        document.getElementById('currentStoryTitle').innerText = currentStory.title;
        const ulVotes = document.getElementById('votes');
        ulVotes.style.listStyle = 'none';
        ulVotes.innerHTML = '';
        for (let username in currentStory.votes) {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.alignItems = 'center';
            li.style.gap = '0.5rem';
            li.style.padding = '0.25rem 0';
            li.innerHTML += `<svg width="1rem" height="1rem" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16Zm3.78-9.72a.75.75 0 0 0-1.06-1.06L6.75 9.19 5.53 7.97a.75.75 0 0 0-1.06 1.06l1.75 1.75a.75.75 0 0 0 1.06 0l4.5-4.5Z" fill="#108548"/></svg><span>${username} has voted</span>`;
            if (session.isAdmin && session.username !== username) {
                const removeButton = document.createElement('button');
                removeButton.textContent = 'Remove';
                removeButton.addEventListener('click', () => socket.emit('removeVote', username));
                li.appendChild(removeButton);
            }
            ulVotes.appendChild(li);
        }
        if (Object.keys(currentStory.votes).length === 0) {
            const li = document.createElement('li');
            li.appendChild(document.createTextNode(`⏳ Waiting for votes`));
            ulVotes.appendChild(li);
            document.getElementById('estimationContainer').style.display = '';
        }
        if (session.isAdmin) {
            document.getElementById('estimationForm').style.display = 'none';
        }
    } else {
        // reset before hiding
        const ulVotes = document.getElementById('votes');
        ulVotes.style.listStyle = 'none';
        ulVotes.innerHTML = '';
        const li = document.createElement('li');
        li.appendChild(document.createTextNode(`⏳ Waiting for votes`));
        ulVotes.appendChild(li);
        document.getElementById('estimationContainer').style.display = 'none';
    }
});
socket.on('storyAdded', (stories) => {
    if (!session.isAdmin) {
        document.getElementById('finishEstimationContainer').style.display = 'none';
    }
    document.getElementById('estimationContainer').style.display = '';
    const currentStory = stories.find(story => story.isCurrent);
    document.getElementById('currentStoryTitle').innerText = currentStory.title;
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    socket.emit('logout');
});

handleAdminCheckBox();

document.getElementById('isAdminInput').addEventListener('change', () => handleAdminCheckBox());

document.getElementById('submitBtn').addEventListener('click', () => {
    const username = document.getElementById('nameInput').value.trim();
    let teamId;
    if (!username) {
        showPopup('Please input your name');
        return;
    }
    const isAdmin = document.getElementById('isAdminInput').checked;
    if (!isAdmin) {
        teamId = document.getElementById('teamIdInput').value.trim();
        if (!teamId) {
            showPopup('Please input your team ID');
            return;
        }
    }
    socket.emit('join-team', {teamId, username, isAdmin});
});

document.getElementById('startEstimationBtn').addEventListener('click', () => {
    const storyTitle = document.getElementById('storyTitleInput').value.trim();
    if (!storyTitle) {
        showPopup('Please provide story title');
        return;
    }
    socket.emit('addStory', storyTitle);
    document.getElementById('estimationForm').style.display = 'none';
});

document.getElementById('finishEstimationBtn').addEventListener('click', () => {
    socket.emit('finishEstimation');
});

export const sendVote = (value) => {
    socket.emit('vote', value);
};
window.sendVote = sendVote;

export const initPage = () => {
    if (session.username) {
        document.getElementById("preLogin").style.display = 'none';
        document.getElementById('logoutBtn').style.display = '';
        if (session.isAdmin) {
            document.getElementById('adminInfo').style.display = '';
            document.getElementById('adminInfo').innerHTML = `Your colleagues can join with Team ID: <b>${session.teamId}</b>`;
            document.getElementById('estimationForm').style.display = '';
            document.getElementById('storyTitleInput').value = '';
            document.getElementById('logoutBtn').innerText = 'Delete Team and Logout';
        }
    } else {
        document.getElementById("logoutBtn").style.display = 'none';
    }
}
