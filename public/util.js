export const handleAdminCheckBox = () => {
    const isChecked = document.getElementById('isAdminInput').checked;
    document.getElementById('teamIdField').style.display = isChecked ? 'none' : 'block';
    document.getElementById('submitBtn').innerHTML = isChecked ? 'Create Team' : 'Join';
};

export const showPopup = message => {
    document.getElementById("popupMessage").innerText = message;
    document.getElementById("popupOverlay").style.display = "flex";
};
window.showPopup = showPopup;

export const closePopup = () => {
    document.getElementById("popupOverlay").style.display = "none";
};
window.closePopup = closePopup;
