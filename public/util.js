export const handleAdminCheckBox = () => {
    const isChecked = document.getElementById('isAdminInput').checked;
    document.getElementById('teamIdField').style.display = isChecked ? 'none' : 'block';
    document.getElementById('submitBtn').innerHTML = isChecked ? 'Create Team' : 'Join';
};
