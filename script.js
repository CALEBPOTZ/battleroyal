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

// --- DOM Elements ---
const connectionErrorMsg = document.getElementById('connectionErrorMsg');
const usernamePrompt = document.getElementById('usernamePrompt');
const usernameInput = document.getElementById('usernameInput');
const saveUsernameBtn = document.getElementById('saveUsernameBtn');
const registrationErrorMsg = document.getElementById('registrationError');
const mainContent = document.getElementById('mainContent');
const welcomeMessage = document.getElementById('welcomeMessage');
const adminSettingsBtn = document.getElementById('adminSettingsBtn'); // Renamed button
const profileSettingsToggle = document.getElementById('profileSettingsToggle');
const copyVsBtn = document.getElementById('copyVsBtn'); // Copy button moved
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
const adminSettingsSection = document.getElementById('adminSettingsSection'); // Renamed section ID
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

// --- Utility Functions ---
function showStatusMessage(element, message, isError = false, duration = 4000) { /* ... (Keep existing) ... */
    element.textContent = message;
    element.className = 'status-message'; // Reset classes
    element.classList.add(isError ? 'error' : 'success');
    element.classList.remove('hidden');
    if (element.timeoutId) clearTimeout(element.timeoutId);
    if (duration > 0) {
        element.timeoutId = setTimeout(() => element.classList.add('hidden'), duration);
    }
}
function hideStatusMessage(element) { /* ... (Keep existing) ... */
     element.classList.add('hidden');
     if (element.timeoutId) clearTimeout(element.timeoutId);
}


// --- Core Functions ---

// Updates the MAIN results table display (No action column)
function updateTable(choices) {
    resultsTableBody.innerHTML = '';
    const usernames = Object.keys(choices);

    if (usernames.length === 0) {
        resultsTableBody.innerHTML = '<tr><td colspan="3">No challengers yet...</td></tr>'; // Colspan is 3 now
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

// Populates the user list within the ADMIN settings panel
function populateAdminUserList(choices) {
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

        // Add "Make Admin" button conditionally
        if (isAdmin && user !== currentUsername && !data.isAdmin) {
            const makeAdminBtn = document.createElement('button');
            makeAdminBtn.textContent = 'Make Admin';
            makeAdminBtn.className = 'admin-make-admin-btn'; // Use specific class for delegation
            makeAdminBtn.dataset.username = user;
            userActions.appendChild(makeAdminBtn);
        }

        // Add "Remove User" button conditionally
        if (isAdmin && user !== currentUsername) { // Admin can remove anyone except self
            const removeUserBtn = document.createElement('button');
            removeUserBtn.textContent = 'Remove User';
            removeUserBtn.className = 'admin-remove-user-btn'; // Use specific class for delegation
            removeUserBtn.dataset.username = user;
            userActions.appendChild(removeUserBtn);
        }

        userItem.appendChild(userInfo);
        // Only add actions div if it has content
        if (userActions.hasChildNodes()) {
            userItem.appendChild(userActions);
        }
        adminUserListContainer.appendChild(userItem);
    });
}

// Shows the main app UI after successful login/registration
function showMainAppInterface() {
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

// Registers the username with the server
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

// Submits the character choice
function submitChoice() { /* ... (Keep existing) ... */
    const word = characterNameInput.value.trim();
    hideStatusMessage(choiceErrorMsg);
    if (!currentUsername) {
        showStatusMessage(choiceErrorMsg, "Please register or wait for connection.", true);
        return;
    }
    if (word) {
        socket.emit('submitChoice', { word: word });
        characterNameInput.value = '';
    } else {
        showStatusMessage(choiceErrorMsg, 'Please enter a character name!', true);
    }
}

// Toggles visibility of a given settings section
function toggleSettingsSection(sectionElement) {
     if (!sectionElement) {
         console.error("Attempted to toggle null section element");
         return;
     }
     // Hide other settings sections first
     if (sectionElement !== profileSettingsSection) profileSettingsSection?.classList.add('hidden');
     if (sectionElement !== adminSettingsSection) adminSettingsSection?.classList.add('hidden');

     sectionElement.classList.toggle('hidden');

     // If opening the admin section, populate the user list
     if (sectionElement === adminSettingsSection && !sectionElement.classList.contains('hidden')) {
          populateAdminUserList(currentChoices);
     }
}

// --- Profile Settings Functions ---
function populatePresetPfps() { /* ... (Keep existing) ... */
    pfpPresetContainer.innerHTML = ''; // Clear existing
    PRESET_PFPS.forEach(url => {
        const img = document.createElement('img');
        img.src = url; img.alt = 'Preset PFP'; img.dataset.url = url;
        img.loading = 'lazy';
        img.addEventListener('click', handlePresetPfpClick);
        pfpPresetContainer.appendChild(img);
    });
}
function handlePresetPfpClick(event) { /* ... (Keep existing) ... */
    selectedPfpUrl = event.target.dataset.url;
    profilePfpPreview.src = selectedPfpUrl;
    profilePfpPreview.onerror = function() { this.src = DEFAULT_PFP; };
    document.querySelectorAll('.pfp-preset-grid img').forEach(img => img.classList.remove('selected'));
    event.target.classList.add('selected');
    pfpPresetChoiceRadio.checked = true;
    pfpCustomUrlContainer.classList.add('hidden');
}
function togglePfpInputMethod() { /* ... (Keep existing) ... */
    if (pfpCustomChoiceRadio.checked) {
        pfpCustomUrlContainer.classList.remove('hidden');
        document.querySelectorAll('.pfp-preset-grid img').forEach(img => img.classList.remove('selected'));
         updatePfpPreview();
    } else {
        pfpCustomUrlContainer.classList.add('hidden');
        const visuallySelectedPreset = document.querySelector('.pfp-preset-grid img.selected');
        if (visuallySelectedPreset) {
             selectedPfpUrl = visuallySelectedPreset.dataset.url;
        } else {
             const currentIsPreset = PRESET_PFPS.includes(currentUserData?.pfpUrl);
             selectedPfpUrl = currentIsPreset ? currentUserData.pfpUrl : PRESET_PFPS[0];
             document.querySelectorAll('.pfp-preset-grid img').forEach(img => {
                img.classList.toggle('selected', img.dataset.url === selectedPfpUrl);
             });
        }
        profilePfpPreview.src = selectedPfpUrl || DEFAULT_PFP;
        profilePfpPreview.onerror = function() { this.src = DEFAULT_PFP; };
    }
}
function showProfileSettings() { /* ... (Keep existing) ... */
    if (!currentUsername || !currentUserData) { return; }
     profileUsernameInput.value = currentUsername;
     const currentPfp = currentUserData.pfpUrl || DEFAULT_PFP;
     selectedPfpUrl = currentPfp;
     const isPreset = PRESET_PFPS.includes(currentPfp);
     pfpPresetChoiceRadio.checked = isPreset;
     pfpCustomChoiceRadio.checked = !isPreset;
     document.querySelectorAll('.pfp-preset-grid img').forEach(img => {
         img.classList.toggle('selected', img.dataset.url === currentPfp);
     });
     profilePfpUrlInput.value = isPreset ? '' : currentPfp;
     pfpCustomUrlContainer.classList.toggle('hidden', isPreset);
     profilePfpPreview.src = currentPfp;
     profilePfpPreview.onerror = function() { this.src = DEFAULT_PFP; };
     hideStatusMessage(profileUpdateStatus);
     toggleSettingsSection(profileSettingsSection);
}
function updatePfpPreview() { /* ... (Keep existing) ... */
    const url = profilePfpUrlInput.value.trim();
    if (pfpCustomChoiceRadio.checked) { selectedPfpUrl = url || DEFAULT_PFP; }
    profilePfpPreview.src = url || DEFAULT_PFP;
    profilePfpPreview.onerror = function() { this.src = DEFAULT_PFP; };
}
function saveProfile() { /* ... (Keep existing) ... */
    const newUsername = currentUsername; // Username change disabled
    let finalPfpUrl;
    if (pfpCustomChoiceRadio.checked) {
        finalPfpUrl = profilePfpUrlInput.value.trim() || DEFAULT_PFP;
    } else {
        const selectedPreset = document.querySelector('.pfp-preset-grid img.selected');
        finalPfpUrl = selectedPreset ? selectedPreset.dataset.url : selectedPfpUrl;
    }
    if (!currentUsername) {
        showStatusMessage(profileUpdateStatus, 'Error: Not logged in.', true); return;
    }
    console.log("[CLIENT] Saving profile:", { newUsername: currentUsername, pfpUrl: finalPfpUrl });
    socket.emit('updateProfile', { newUsername: currentUsername, pfpUrl: finalPfpUrl });
}

// --- Admin Panel Functions ---
function handleAdminUserListClick(event) { /* ... (Keep existing) ... */
    const target = event.target;
    // Check if the clicked element is one of the admin buttons
    const targetUsername = target.closest('button')?.dataset.username; // Get username from button dataset

    if (!targetUsername) return; // Click wasn't on a button with username

    if (target.classList.contains('admin-make-admin-btn')) {
        if (confirm(`Are you sure you want to make ${targetUsername} the new admin? You will lose your admin rights.`)) {
            console.log(`[CLIENT] Requesting to make ${targetUsername} admin.`);
            socket.emit('setAdmin', targetUsername);
        }
    } else if (target.classList.contains('admin-remove-user-btn')) {
         if (confirm(`Are you sure you want to REMOVE the user ${targetUsername} completely? This cannot be undone.`)) {
            console.log(`[CLIENT] Requesting to remove user ${targetUsername}.`);
            socket.emit('removeUser', targetUsername);
        }
    }
}


// --- Copy VS String Function ---
async function copyVsStringToClipboard() { /* ... (Keep existing) ... */
    console.log("[CLIENT] Copy VS button clicked."); // DEBUG
    try {
        const response = await fetch('/vs');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const vsText = await response.text();
         console.log("[CLIENT] Fetched /vs text:", vsText); // DEBUG

        if (!vsText || vsText === "No characters chosen yet!") {
             showStatusMessage(copyVsBtn, "Nothing to copy yet!", true, 2000); // Use showStatusMessage for feedback
             // Re-enable button after message disappears
             setTimeout(() => { copyVsBtn.disabled = false; }, 2000);
             return;
        }

        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(vsText);
            console.log("[CLIENT] Copied to clipboard:", vsText); // DEBUG
            // Visual feedback using showStatusMessage on the button itself (or a dedicated status element)
            const originalText = copyVsBtn.textContent;
            copyVsBtn.textContent = 'Copied!';
            copyVsBtn.disabled = true;
             showStatusMessage(copyVsBtn, 'Copied!', false, 2000); // Show short success feedback
            setTimeout(() => {
                copyVsBtn.textContent = originalText;
                copyVsBtn.disabled = false;
                hideStatusMessage(copyVsBtn); // Hide status message on button if used
            }, 2000);
        } else {
            console.warn("[CLIENT] Clipboard API not available or context insecure."); // DEBUG
            alert('Clipboard API not available. Prompt text:\n\n' + vsText);
        }
    } catch (error) {
        console.error('[CLIENT] Failed to fetch or copy /vs string:', error);
        alert('Failed to copy battle prompt. See console for details.');
        copyVsBtn.disabled = false; // Re-enable button on error
    }
}


// --- Event Listeners ---
saveUsernameBtn.addEventListener('click', registerUsername);
usernameInput.addEventListener('keypress', (event) => { if (event.key === 'Enter') registerUsername(); });
submitBtn.addEventListener('click', submitChoice);
characterNameInput.addEventListener('keypress', (event) => { if (event.key === 'Enter') submitChoice(); });
profileSettingsToggle.addEventListener('click', showProfileSettings);
adminSettingsBtn.addEventListener('click', () => toggleSettingsSection(adminSettingsSection)); // Use updated ID and function
saveProfileBtn.addEventListener('click', saveProfile);
profilePfpUrlInput.addEventListener('input', updatePfpPreview);
pfpPresetChoiceRadio.addEventListener('change', togglePfpInputMethod);
pfpCustomChoiceRadio.addEventListener('change', togglePfpInputMethod);
adminUserListContainer.addEventListener('click', handleAdminUserListClick); // Use updated container ID
copyVsBtn.addEventListener('click', copyVsStringToClipboard);
bgColorInput.addEventListener('input', (e) => { /* ... (Keep existing) ... */ });
bgImageInput.addEventListener('change', (e) => { /* ... (Keep existing) ... */ });
logoUrlInput.addEventListener('change', (e) => { /* ... (Keep existing) ... */ });

// --- Socket.IO Event Handlers ---

socket.on('connect', () => { /* ... (Keep existing, ensure IDs are correct) ... */
    console.log('[CLIENT] Connected to server via Socket.IO:', socket.id);
    connectionErrorMsg.classList.add('hidden');
    populatePresetPfps();
    const savedUsername = localStorage.getItem('starlightUsername');
    if (savedUsername) {
        console.log(`[CLIENT] Found saved username: ${savedUsername}. Attempting auto-register.`);
        currentUsername = savedUsername; // Assume this is us for registration attempt
        socket.emit('registerUser', savedUsername);
    } else {
        console.log("[CLIENT] No saved username found. Showing registration prompt.");
        mainContent.classList.add('hidden');
        profileSettingsSection?.classList.add('hidden'); // Use optional chaining
        adminSettingsSection?.classList.add('hidden'); // Use optional chaining
        usernamePrompt?.classList.remove('hidden'); // Use optional chaining
        registrationErrorMsg?.classList.add('hidden'); // Use optional chaining
    }
});

socket.on('registrationSuccess', (data) => { /* ... (Keep existing, ensure IDs correct) ... */
    console.log('[CLIENT] Received registrationSuccess:', data.username, 'isAdmin:', data.isAdmin);
    currentUsername = data.username;
    isAdmin = data.isAdmin;
    localStorage.setItem('starlightUsername', currentUsername);

    currentChoices = data.initialData;
    const serverData = currentChoices[currentUsername];
    currentUserData = {
        word: serverData?.word || null,
        pfpUrl: serverData?.pfpUrl || DEFAULT_PFP,
        isAdmin: isAdmin
    };
    console.log("[CLIENT] Set currentUserData:", currentUserData);

    updateTable(currentChoices);
    showMainAppInterface();
});

socket.on('registrationError', (message) => { /* ... (Keep existing, ensure IDs correct) ... */
    console.error('[CLIENT] Received registrationError:', message);
    registrationErrorMsg.textContent = message;
    registrationErrorMsg.classList.remove('hidden');
    // Don't remove localStorage
    mainContent.classList.add('hidden');
    usernamePrompt.classList.remove('hidden');
    usernameInput.focus();
});

socket.on('initialState', (choices) => { /* ... (Keep existing, ensure IDs correct) ... */
    console.log('[CLIENT] Received initialState:', choices);
    currentChoices = choices;
    updateTable(currentChoices);
    if (currentUsername && currentChoices[currentUsername]) {
         currentUserData = currentChoices[currentUsername];
         isAdmin = currentUserData.isAdmin;
         console.log("[CLIENT] Updated currentUserData from initialState:", currentUserData);
         if (!mainContent.classList.contains('hidden')) {
            adminSettingsBtn.classList.toggle('hidden', !isAdmin);
            copyVsBtn.classList.toggle('hidden', !isAdmin);
         }
    } else if (currentUsername && !currentChoices[currentUsername]) {
         console.log("[CLIENT] User mismatch on initialState. Clearing local state.");
         localStorage.removeItem('starlightUsername');
         currentUsername = null; isAdmin = false; currentUserData = {};
         usernamePrompt.classList.remove('hidden');
         mainContent.classList.add('hidden');
    }
});


socket.on('updateChoices', (choices) => { /* ... (Keep existing, ensure IDs correct) ... */
    console.log('[CLIENT] Received updateChoices:', choices);
    currentChoices = choices;

     if (currentUsername && currentChoices[currentUsername]) {
         currentUserData = currentChoices[currentUsername];
         const newlyAdmin = currentUserData.isAdmin;
         if (newlyAdmin !== isAdmin) {
             console.log(`[CLIENT] Admin status changed locally to: ${newlyAdmin}`);
             isAdmin = newlyAdmin;
              if (!isAdmin && adminSettingsSection) { // Hide section if user lost admin
                 adminSettingsSection.classList.add('hidden');
             }
         }
     } else if (currentUsername && !currentChoices[currentUsername]) {
         console.log("[CLIENT] Current user removed by server update. Forcing logout.");
         alert("You have been removed from the session.");
         localStorage.removeItem('starlightUsername');
         currentUsername = null; isAdmin = false; currentUserData = {}; currentChoices = {};
         mainContent.classList.add('hidden');
         profileSettingsSection?.classList.add('hidden');
         adminSettingsSection?.classList.add('hidden');
         usernamePrompt?.classList.remove('hidden');
         updateTable({});
         return;
     }

    updateTable(currentChoices);

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
socket.on('usernameChanged', (newUsername) => { /* ... (Keep existing) ... */
     console.log(`[CLIENT] Username changed locally to: ${newUsername}`);
    currentUsername = newUsername;
    localStorage.setItem('starlightUsername', currentUsername);
    if(welcomeMessage) welcomeMessage.textContent = `Welcome, ${currentUsername}!`;
});
socket.on('connect_error', (err) => { /* ... (Keep existing, ensure ID correct) ... */
     console.error('[CLIENT] Connection Error:', err);
    connectionErrorMsg.textContent = '⚠️ Connection to server lost. Please refresh the page. ⚠️';
    connectionErrorMsg.classList.remove('hidden');
});
socket.on('disconnect', (reason) => { /* ... (Keep existing, ensure ID correct) ... */
      console.log(`[CLIENT] Disconnected: ${reason}`);
     connectionErrorMsg.textContent = '⚠️ Disconnected from server. Attempting to reconnect... Please refresh if issues persist. ⚠️';
     connectionErrorMsg.classList.remove('hidden');
});
socket.on('reconnect', (attemptNumber) => { /* ... (Keep existing, ensure ID correct) ... */
     console.log(`[CLIENT] Reconnected to server after ${attemptNumber} attempts.`);
     connectionErrorMsg.classList.add('hidden'); // Hide error on reconnect
     if (currentUsername) {
         console.log("[CLIENT] Attempting to re-register after reconnect...");
         socket.emit('registerUser', currentUsername);
     } else {
         console.log("[CLIENT] No current username on reconnect, showing prompt.");
         usernamePrompt?.classList.remove('hidden');
         mainContent?.classList.add('hidden');
     }
});