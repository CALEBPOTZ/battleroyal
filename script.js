// script.js

// --- Connect to Socket.IO Server ---
const socket = io();

// --- Configuration ---
const DEFAULT_PFP = 'https://picsum.photos/seed/default/50';
const PRESET_PFPS = [
    'https://picsum.photos/seed/p1/50', 'https://picsum.photos/seed/p2/50', 'https://picsum.photos/seed/p3/50',
    'https://picsum.photos/seed/p4/50', 'https://picsum.photos/seed/p5/50', 'https://picsum.photos/seed/p6/50',
    'https://picsum.photos/seed/p7/50', 'https://picsum.photos/seed/p8/50', 'https://picsum.photos/seed/p9/50',
    'https://picsum.photos/seed/p10/50'
];
const MAX_CHARACTER_NAME_LENGTH = 100;

// --- DOM Elements ---
const connectionErrorMsg = document.getElementById('connectionErrorMsg');
const usernamePrompt = document.getElementById('usernamePrompt');
const usernameInput = document.getElementById('usernameInput');
const saveUsernameBtn = document.getElementById('saveUsernameBtn');
const registrationErrorMsg = document.getElementById('registrationError');
const mainContent = document.getElementById('mainContent');
const welcomeMessage = document.getElementById('welcomeMessage');
const adminSettingsBtn = document.getElementById('adminSettingsBtn');
const profileSettingsToggle = document.getElementById('profileSettingsToggle');
const copyVsBtn = document.getElementById('copyVsBtn');
const profileSettingsSection = document.getElementById('profileSettingsSection');
const profileUsernameInput = document.getElementById('profileUsername');
const profilePfpUrlInput = document.getElementById('profilePfpUrl');
const profilePfpPreview = document.getElementById('profilePfpPreview');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const profileUpdateStatus = document.getElementById('profileUpdateStatus');
const pfpPresetContainer = document.getElementById('pfpPresetContainer');
const pfpCustomUrlContainer = document.getElementById('pfpCustomUrlContainer');
const pfpPresetChoiceRadio = document.getElementById('pfpPresetChoice');
const pfpCustomChoiceRadio = document.getElementById('pfpCustomChoice');
const characterNameInput = document.getElementById('characterName');
const submitBtn = document.getElementById('submitBtn');
const choiceErrorMsg = document.getElementById('choiceError');
const resultsTableBody = document.getElementById('resultsTable').querySelector('tbody');
const adminSettingsSection = document.getElementById('adminSettingsSection');
const adminUserListContainer = document.getElementById('adminUserListContainer');
const adminUserMgmtStatus = document.getElementById('adminUserMgmtStatus');
const bgColorInput = document.getElementById('bgColor');
const bgImageInput = document.getElementById('bgImage');
const logoUrlInput = document.getElementById('logoUrl');
const appLogo = document.getElementById('appLogo');
const bodyElement = document.body;
const root = document.documentElement;

// --- State ---
let currentUsername = null;
let isAdmin = false;
let currentUserData = {};
let selectedPfpUrl = DEFAULT_PFP;
let currentChoices = {};
let copyButtonTimeout = null; // Timeout ID for copy button reset

// --- Utility Functions ---
function showStatusMessage(element, message, isError = false, duration = 4000) {
    if (!element) return; // Prevent errors if element doesn't exist
    element.textContent = message;
    element.className = 'status-message'; // Reset classes
    element.classList.add(isError ? 'error' : 'success');
    element.classList.remove('hidden');
    if (element.timeoutId) clearTimeout(element.timeoutId);
    if (duration > 0) {
        element.timeoutId = setTimeout(() => element.classList.add('hidden'), duration);
    }
}
function hideStatusMessage(element) {
     if (!element) return;
     element.classList.add('hidden');
     if (element.timeoutId) clearTimeout(element.timeoutId);
}


// --- Core Functions ---

function updateTable(choices) { /* ... (Keep existing) ... */
    resultsTableBody.innerHTML = '';
    const usernames = Object.keys(choices);

    if (usernames.length === 0) {
        resultsTableBody.innerHTML = '<tr><td colspan="3">No challengers yet...</td></tr>';
        return;
    }

    usernames.sort().forEach(user => {
        const data = choices[user];
        if (!data) return;

        const row = resultsTableBody.insertRow();

        const pfpCell = row.insertCell();
        pfpCell.classList.add('pfp-col');
        const pfpImg = document.createElement('img');
        pfpImg.src = data.pfpUrl || DEFAULT_PFP;
        pfpImg.alt = `${user} PFP`;
        pfpImg.onerror = function() { this.src = DEFAULT_PFP; };
        pfpCell.appendChild(pfpImg);

        const userCell = row.insertCell();
        userCell.textContent = user;
        if (data.isAdmin) {
            const crown = document.createElement('span');
            crown.className = 'admin-crown'; crown.title = 'Admin'; crown.textContent = '👑';
            userCell.appendChild(crown);
        }

        const wordCell = row.insertCell();
        wordCell.textContent = data.word || '...';
    });
}

function populateAdminUserList(choices) { /* ... (Keep existing) ... */
     adminUserListContainer.innerHTML = '';
    hideStatusMessage(adminUserMgmtStatus);
    const usernames = Object.keys(choices);

    if (usernames.length === 0) {
        adminUserListContainer.innerHTML = '<p>No users connected.</p>';
        return;
    }

    usernames.sort().forEach(user => {
        const data = choices[user];
        if (!data) return;

        const userItem = document.createElement('div');
        userItem.className = 'admin-user-item';

        const userInfo = document.createElement('div');
        userInfo.className = 'admin-user-info';
        const userImg = document.createElement('img');
        userImg.src = data.pfpUrl || DEFAULT_PFP;
        userImg.alt = `${user} PFP`;
        userImg.onerror = function() { this.src = DEFAULT_PFP; };
        const userNameSpan = document.createElement('span');
        userNameSpan.textContent = user;
        userInfo.appendChild(userImg);
        userInfo.appendChild(userNameSpan);
        if (data.isAdmin) {
            const crown = document.createElement('span');
            crown.className = 'admin-crown'; crown.title = 'Admin'; crown.textContent = '👑';
            userInfo.appendChild(crown);
        }

        const userActions = document.createElement('div');
        userActions.className = 'admin-user-actions';

        if (isAdmin && user !== currentUsername && !data.isAdmin) {
            const makeAdminBtn = document.createElement('button');
            makeAdminBtn.textContent = 'Make Admin';
            makeAdminBtn.className = 'admin-make-admin-btn';
            makeAdminBtn.dataset.username = user;
            userActions.appendChild(makeAdminBtn);
        }

        if (isAdmin && user !== currentUsername) {
            const removeUserBtn = document.createElement('button');
            removeUserBtn.textContent = 'Remove User';
            removeUserBtn.className = 'admin-remove-user-btn';
            removeUserBtn.dataset.username = user;
            userActions.appendChild(removeUserBtn);
        }

        userItem.appendChild(userInfo);
        if (userActions.hasChildNodes()) {
            userItem.appendChild(userActions);
        }
        adminUserListContainer.appendChild(userItem);
    });
}

function showMainAppInterface() { /* ... (Keep existing) ... */
     console.log("[CLIENT] showMainAppInterface called. Username:", currentUsername, "isAdmin:", isAdmin);
    if (!currentUsername) {
        console.error("[CLIENT] Cannot show main interface without a username!");
         usernamePrompt.classList.remove('hidden');
         mainContent.classList.add('hidden');
        return;
    }
    if (usernamePrompt) usernamePrompt.classList.add('hidden'); else console.error("usernamePrompt element not found");
    if (mainContent) mainContent.classList.remove('hidden'); else console.error("mainContent element not found");
    if (welcomeMessage) welcomeMessage.textContent = `Welcome, ${currentUsername}!`; else console.error("welcomeMessage element not found");

    const showAdminButtons = isAdmin;
    if (adminSettingsBtn) adminSettingsBtn.classList.toggle('hidden', !showAdminButtons); else console.error("adminSettingsBtn element not found");
    if (copyVsBtn) copyVsBtn.classList.toggle('hidden', !showAdminButtons); else console.error("copyVsBtn element not found");

    if (!showAdminButtons && adminSettingsSection) {
         adminSettingsSection.classList.add('hidden');
    }
    if (profileSettingsToggle) profileSettingsToggle.classList.remove('hidden'); else console.error("profileSettingsToggle element not found");
    console.log("[CLIENT] showMainAppInterface finished.");
}

function registerUsername() { /* ... (Keep existing) ... */
    const username = usernameInput.value.trim();
    registrationErrorMsg.classList.add('hidden');
    if (username) {
        console.log(`[CLIENT] Attempting to register username: ${username}`);
        socket.emit('registerUser', username);
    } else {
        registrationErrorMsg.textContent = 'Please enter a valid username!';
        registrationErrorMsg.classList.remove('hidden');
    }
}

// Submits the character choice with length validation
function submitChoice() {
    const word = characterNameInput.value.trim();
    hideStatusMessage(choiceErrorMsg);
    if (!currentUsername) {
        showStatusMessage(choiceErrorMsg, "Please register or wait for connection.", true);
        return;
    }
    // Client-side length validation
    if (word.length > MAX_CHARACTER_NAME_LENGTH) {
         showStatusMessage(choiceErrorMsg, `Character name cannot exceed ${MAX_CHARACTER_NAME_LENGTH} characters.`, true);
         return;
    }

    if (word) {
        socket.emit('submitChoice', { word: word });
        characterNameInput.value = '';
    } else {
        showStatusMessage(choiceErrorMsg, 'Please enter a character name!', true);
    }
}

function toggleSettingsSection(sectionElement) { /* ... (Keep existing) ... */
      if (!sectionElement) { console.error("Attempted to toggle null section element"); return; }
     if (sectionElement !== profileSettingsSection) profileSettingsSection?.classList.add('hidden');
     if (sectionElement !== adminSettingsSection) adminSettingsSection?.classList.add('hidden');
     sectionElement.classList.toggle('hidden');
     if (sectionElement === adminSettingsSection && !sectionElement.classList.contains('hidden')) {
          populateAdminUserList(currentChoices);
     }
}

// --- Profile Settings Functions ---
function populatePresetPfps() { /* ... (Keep existing) ... */ }
function handlePresetPfpClick(event) { /* ... (Keep existing) ... */ }
function togglePfpInputMethod() { /* ... (Keep existing) ... */ }
function showProfileSettings() { /* ... (Keep existing) ... */ }
function updatePfpPreview() { /* ... (Keep existing) ... */ }
function saveProfile() { /* ... (Keep existing) ... */ }

// --- Admin Panel Functions ---
function handleAdminUserListClick(event) { /* ... (Keep existing) ... */ }


// --- Copy VS String Function (Fixed Timeout) ---
async function copyVsStringToClipboard() {
    console.log("[CLIENT] Copy VS button clicked.");
    // Clear previous timeout if running
    if (copyButtonTimeout) {
        clearTimeout(copyButtonTimeout);
        copyButtonTimeout = null;
    }
    const originalText = copyVsBtn.textContent; // Store original text immediately

    try {
        copyVsBtn.disabled = true; // Disable button early
        copyVsBtn.textContent = 'Copying...'; // Indicate action

        const response = await fetch('/vs');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const vsText = await response.text();
        console.log("[CLIENT] Fetched /vs text:", vsText);

        if (!vsText || vsText === "No characters chosen yet!") {
            copyVsBtn.textContent = 'Nothing to copy!'; // Change text for feedback
             copyButtonTimeout = setTimeout(() => { // Set timeout to revert
                 copyVsBtn.textContent = originalText;
                 copyVsBtn.disabled = false;
                 copyButtonTimeout = null;
             }, 2000);
            return; // Don't try to copy
        }

        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(vsText);
            console.log("[CLIENT] Copied to clipboard:", vsText);
            copyVsBtn.textContent = 'Copied!'; // Success feedback
            // Set timeout to revert text and enabled state
             copyButtonTimeout = setTimeout(() => {
                 copyVsBtn.textContent = originalText;
                 copyVsBtn.disabled = false;
                 copyButtonTimeout = null;
             }, 2000); // Revert after 2 seconds

        } else {
            console.warn("[CLIENT] Clipboard API not available or context insecure.");
            alert('Clipboard API not available. Prompt text:\n\n' + vsText);
            // Revert button immediately if fallback alert is used
            copyVsBtn.textContent = originalText;
            copyVsBtn.disabled = false;
        }
    } catch (error) {
        console.error('[CLIENT] Failed to fetch or copy /vs string:', error);
        copyVsBtn.textContent = 'Error Copying!'; // Error feedback
        // Set timeout to revert text and enabled state
         copyButtonTimeout = setTimeout(() => {
             copyVsBtn.textContent = originalText;
             copyVsBtn.disabled = false;
             copyButtonTimeout = null;
         }, 3000); // Show error slightly longer
    }
}


// --- Event Listeners ---
saveUsernameBtn.addEventListener('click', registerUsername);
usernameInput.addEventListener('keypress', (event) => { if (event.key === 'Enter') registerUsername(); });
submitBtn.addEventListener('click', submitChoice);
characterNameInput.addEventListener('keypress', (event) => { if (event.key === 'Enter') submitChoice(); });
profileSettingsToggle.addEventListener('click', showProfileSettings);
adminSettingsBtn.addEventListener('click', () => toggleSettingsSection(adminSettingsSection));
saveProfileBtn.addEventListener('click', saveProfile);
profilePfpUrlInput.addEventListener('input', updatePfpPreview);
pfpPresetChoiceRadio.addEventListener('change', togglePfpInputMethod);
pfpCustomChoiceRadio.addEventListener('change', togglePfpInputMethod);
adminUserListContainer.addEventListener('click', handleAdminUserListClick);
copyVsBtn.addEventListener('click', copyVsStringToClipboard);
// Appearance listeners - no changes needed
bgColorInput.addEventListener('input', (e) => { /* ... */ });
bgImageInput.addEventListener('change', (e) => { /* ... */ });
logoUrlInput.addEventListener('change', (e) => { /* ... */ });


// --- Socket.IO Event Handlers ---

socket.on('connect', () => { /* ... (Keep existing) ... */ });
socket.on('registrationSuccess', (data) => { /* ... (Keep existing) ... */ });
socket.on('registrationError', (message) => { /* ... (Keep existing) ... */ });
socket.on('initialState', (choices) => { /* ... (Keep existing) ... */ });

// Update handler - Refined user removal message
socket.on('updateChoices', (choices) => {
    console.log('[CLIENT] Received updateChoices:', choices);
    const oldChoices = currentChoices; // Store previous state for comparison if needed
    currentChoices = choices;

     if (currentUsername && currentChoices[currentUsername]) {
         // User still exists, update data and admin status
         currentUserData = currentChoices[currentUsername];
         const newlyAdmin = currentUserData.isAdmin;
         if (newlyAdmin !== isAdmin) {
             console.log(`[CLIENT] Admin status changed locally to: ${newlyAdmin}`);
             isAdmin = newlyAdmin;
              if (!isAdmin && adminSettingsSection) {
                 adminSettingsSection.classList.add('hidden');
             }
         }
     } else if (currentUsername && !currentChoices[currentUsername]) {
         // Current user existed before but is now missing -> Removed by admin
         console.log("[CLIENT] Current user removed by server update. Forcing logout.");
         // Provide a clearer message than just a generic disconnect
         alert("You have been removed from the battle royal by an admin.");
         localStorage.removeItem('starlightUsername');
         // Reset state and UI completely
         currentUsername = null; isAdmin = false; currentUserData = {}; currentChoices = {};
         mainContent.classList.add('hidden');
         profileSettingsSection?.classList.add('hidden');
         adminSettingsSection?.classList.add('hidden');
         usernamePrompt?.classList.remove('hidden');
         updateTable({}); // Clear table display
         // Optionally reload page: window.location.reload();
         return; // Stop further processing for this update
     }
     // If currentUsername is null, do nothing with currentUserData

    updateTable(currentChoices); // Update main table display

    // Refresh admin button visibility and admin panel list (if open)
    if(currentUsername) {
        adminSettingsBtn?.classList.toggle('hidden', !isAdmin);
        copyVsBtn?.classList.toggle('hidden', !isAdmin);
        if (adminSettingsSection && !adminSettingsSection.classList.contains('hidden')) {
             populateAdminUserList(currentChoices);
        }
    }
});

socket.on('choiceError', (message) => { showStatusMessage(choiceErrorMsg, message, true); });
socket.on('profileUpdateSuccess', (message) => { showStatusMessage(profileUpdateStatus, message, false); });
socket.on('profileUpdateError', (message) => { showStatusMessage(profileUpdateStatus, message, true); });
socket.on('adminActionError', (message) => { showStatusMessage(adminUserMgmtStatus, message, true); });
socket.on('adminActionSuccess', (message) => { showStatusMessage(adminUserMgmtStatus, message, false); });
socket.on('usernameChanged', (newUsername) => { /* ... (Keep existing) ... */ });
socket.on('connect_error', (err) => { /* ... (Keep existing) ... */ });
socket.on('disconnect', (reason) => { /* ... (Keep existing - shows generic disconnect message) ... */
     console.log(`[CLIENT] Disconnected: ${reason}`);
     connectionErrorMsg.textContent = '⚠️ Disconnected from server. Attempting to reconnect... Please refresh if issues persist. ⚠️';
     connectionErrorMsg.classList.remove('hidden');
     // Add more robust handling here if needed, e.g., disable inputs
});
socket.on('reconnect', (attemptNumber) => { /* ... (Keep existing) ... */ });

// --- Initial Setup ---
// Moved initial population to socket 'connect' event