// server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io"); // Correctly imports Server class
const path = require('path');
const fs = require('fs');
const app = express();
const server = http.createServer(app);
const io = new Server(server); // Creates the Socket.IO server instance
const port = process.env.PORT || 3000;

// --- Configuration ---
const ADMIN_CONFIG_FILE = path.join(__dirname, 'admin_config.json');
const DEFAULT_PFP = 'https://picsum.photos/seed/default/50';
const DEFAULT_APPEARANCE = { // Define default appearance settings
    bgColor: '#8BC6EC',
    bgImageUrl: null,
    logoUrl: 'https://via.placeholder.com/50/FFFFFF/000000?text=★'
};

// --- Admin Tracking ---
let adminUsername = null;

// --- Data Storage (In-Memory) ---
let userChoices = {}; // Stores { "Username1": { word: "Word1", pfpUrl: "url1", isAdmin: false }, ... }
let currentAppearance = { ...DEFAULT_APPEARANCE }; // Initialize with defaults

// --- Helper Functions ---
function loadAdminConfig() {
    console.log("[SERVER] Attempting to load admin config...");
    try {
        if (fs.existsSync(ADMIN_CONFIG_FILE)) {
            const data = fs.readFileSync(ADMIN_CONFIG_FILE, 'utf8');
            const config = JSON.parse(data);
            if (config.adminUsername) {
                adminUsername = config.adminUsername;
                console.log(`[SERVER] Admin user loaded from config: ${adminUsername}`);
            } else {
                console.log("[SERVER] Admin config file found but no adminUsername property.");
                adminUsername = null;
            }
            // Load appearance settings if they exist, otherwise use defaults
            currentAppearance = {
                bgColor: config.appearance?.bgColor || DEFAULT_APPEARANCE.bgColor,
                bgImageUrl: config.appearance?.bgImageUrl || DEFAULT_APPEARANCE.bgImageUrl,
                logoUrl: config.appearance?.logoUrl || DEFAULT_APPEARANCE.logoUrl,
            };
            console.log(`[SERVER] Appearance settings loaded:`, currentAppearance);

        } else {
            console.log('[SERVER] Admin config file not found. First registered user will be admin. Using default appearance.');
            adminUsername = null;
            currentAppearance = { ...DEFAULT_APPEARANCE }; // Reset to defaults if file not found
        }
    } catch (err) {
        console.error('[SERVER] Error loading admin config:', err);
        adminUsername = null;
        currentAppearance = { ...DEFAULT_APPEARANCE }; // Reset on error
    }
}

function saveAdminConfig() {
    console.log(`[SERVER] Attempting to save admin config. Current admin: ${adminUsername}`);
    try {
        const config = {
            adminUsername: adminUsername,
            appearance: currentAppearance // Save current appearance settings
        };
        fs.writeFileSync(ADMIN_CONFIG_FILE, JSON.stringify(config, null, 2));
        console.log(`[SERVER] Admin config saved (Admin: ${adminUsername}, Appearance:`, currentAppearance, ')');
    } catch (err) {
        console.error('[SERVER] Error saving admin config:', err);
    }
}

function syncAdminStatus() {
    Object.keys(userChoices).forEach(username => {
        if (userChoices[username]) {
            userChoices[username].isAdmin = (username === adminUsername);
        }
    });
}

// Broadcasts the current state to all clients
function broadcastUpdates(includeAppearance = false) { // Add flag
    syncAdminStatus();
    console.log("[SERVER] Broadcasting 'updateChoices':", Object.keys(userChoices));
    io.emit('updateChoices', userChoices);

    // Optionally broadcast appearance changes separately or bundled
    if (includeAppearance) {
        console.log("[SERVER] Broadcasting 'applyAppearance':", currentAppearance);
        io.emit('applyAppearance', currentAppearance);
    }
}

function getFullState() {
    syncAdminStatus(); // Ensure admin flags are up-to-date
    return {
        choices: userChoices,
        appearance: currentAppearance
    };
}

// --- Serve Static Files ---
app.use(express.static(path.join(__dirname)));

// --- API Endpoint for Admin 'vs' String ---
app.get('/vs', (req, res) => {
    const words = Object.values(userChoices)
        .map(data => data.word)
        .filter(word => word);
    if (words.length === 0) {
        res.send("No characters chosen yet!");
    } else {
        res.type('text/plain').send(words.join(' vs '));
    }
});

// --- Real-time Communication (Socket.IO) ---
// The 'socket' variable here represents an individual client connection
io.on('connection', (socket) => {
    // *** ADDED LOG ***
    console.log(`[SERVER] User connected: ${socket.id}. Awaiting registration or actions.`);

    // Send current full state (choices + appearance) immediately
    console.log(`[SERVER] Emitting 'initialState' to ${socket.id}`);
    socket.emit('initialState', getFullState());

    // Handle user registration attempt
    socket.on('registerUser', (username) => {
        // *** ADDED LOG ***
        console.log(`[SERVER] Received 'registerUser' event for username: '${username}' from socket ${socket.id}`);
        const trimmedUsername = username ? username.trim() : null;

        if (!trimmedUsername) {
            console.log(`[SERVER] Registration failed for ${socket.id}: Username empty.`);
            socket.emit('registrationError', 'Username cannot be empty.');
            return;
        }

        if (userChoices[trimmedUsername]) {
            console.log(`[SERVER] User ${trimmedUsername} is reconnecting or already exists.`);
            socket.username = trimmedUsername; // Associate socket with username
            const isAdmin = (trimmedUsername === adminUsername);
            userChoices[trimmedUsername].isAdmin = isAdmin;
            console.log(`[SERVER] Re-associating socket ${socket.id} with ${trimmedUsername}. isAdmin: ${isAdmin}`);

            const successData = {
                username: trimmedUsername,
                isAdmin: isAdmin,
                initialData: getFullState() // Send current full state
            };
            console.log(`[SERVER] Emitting 'registrationSuccess' (reconnect) to ${socket.id}`);
            socket.emit('registrationSuccess', successData);
            return;
        }

        console.log(`[SERVER] Registering NEW user ${trimmedUsername} for socket ${socket.id}`);
        socket.username = trimmedUsername; // Associate socket with username
        let isNewUserAdmin = false;

        if (!adminUsername) {
            console.log(`[SERVER] No admin found. Assigning ${trimmedUsername} as first admin.`);
            adminUsername = trimmedUsername;
            isNewUserAdmin = true;
            // Save config immediately when first admin is assigned
        } else {
            isNewUserAdmin = false;
            console.log(`[SERVER] Admin (${adminUsername}) already exists. ${trimmedUsername} is a regular user.`);
        }

        userChoices[trimmedUsername] = {
            word: null,
            pfpUrl: DEFAULT_PFP,
            isAdmin: isNewUserAdmin
        };
        console.log(`[SERVER] Added ${trimmedUsername} to userChoices.`);

        // Save config if the new user became admin
        if (isNewUserAdmin) {
            saveAdminConfig();
        }

        const successData = {
            username: trimmedUsername,
            isAdmin: isNewUserAdmin,
            initialData: getFullState() // Send the latest full state
        };
        console.log(`[SERVER] Emitting 'registrationSuccess' (new user) to ${socket.id}`);
        socket.emit('registrationSuccess', successData);

        broadcastUpdates(); // Broadcast user list change
    });

    socket.on('submitChoice', (data) => {
        const username = socket.username; // Use username associated with this specific socket connection
        const word = data.word ? data.word.trim() : null;

        if (username && userChoices[username] && word) {
            console.log(`[SERVER] ${username} chose: ${word}`);
            userChoices[username].word = word;
            broadcastUpdates();
        } else if (!username) {
            console.log(`[SERVER] Socket ${socket.id} tried to submit choice without being registered.`);
            socket.emit('choiceError', 'Please register first.');
        } else if (username && userChoices[username] && !word) {
            socket.emit('choiceError', 'Please enter a character name.');
        } else {
            console.log(`[SERVER] Invalid choice scenario for user ${username}:`, data);
        }
    });

    socket.on('updateProfile', (data) => {
        const username = socket.username; // Use username associated with this specific socket connection
        const newPfpUrl = data.pfpUrl ? data.pfpUrl.trim() : DEFAULT_PFP;

        if (!username || !userChoices[username]) {
            console.log(`[SERVER] Profile update failed: User ${username} not found.`);
            socket.emit('profileUpdateError', 'Cannot update profile. User not recognized.');
            return;
        }

        console.log(`[SERVER] Updating PFP for ${username}`);
        userChoices[username].pfpUrl = newPfpUrl;
        broadcastUpdates();
        socket.emit('profileUpdateSuccess', 'Profile picture updated!');
    });

    // Handle Admin Action: Update Appearance Settings
    socket.on('updateAppearance', (appearanceData) => {
        const requesterUsername = socket.username; // Use username associated with this specific socket connection

        if (!requesterUsername || requesterUsername !== adminUsername) {
            console.log(`[SERVER] Appearance update denied: Requester ${requesterUsername} is not admin ${adminUsername}`);
            socket.emit('appearanceUpdateError', 'Only the admin can change appearance settings.');
            return;
        }

        if (!appearanceData) {
            socket.emit('appearanceUpdateError', 'Invalid appearance data received.');
            return;
        }

        console.log(`[SERVER] Admin ${requesterUsername} updating appearance:`, appearanceData);

        // Update server state (validate/sanitize if necessary)
        currentAppearance.bgColor = appearanceData.bgColor || DEFAULT_APPEARANCE.bgColor;
        currentAppearance.bgImageUrl = appearanceData.bgImageUrl || null; // Ensure null if empty/falsy
        currentAppearance.logoUrl = appearanceData.logoUrl || DEFAULT_APPEARANCE.logoUrl; // Use default if empty/falsy

        saveAdminConfig(); // Persist the changes
        broadcastUpdates(true); // Broadcast user list AND new appearance
        socket.emit('appearanceUpdateSuccess', 'Appearance settings saved!');
    });

    socket.on('setAdmin', (targetUsername) => {
        const requesterUsername = socket.username; // Use username associated with this specific socket connection

        if (!requesterUsername || requesterUsername !== adminUsername) {
            console.log(`[SERVER] Admin action denied: Requester ${requesterUsername} is not admin ${adminUsername}`);
            socket.emit('adminActionError', 'Only the current admin can perform this action.');
            return;
        }
        if (!targetUsername || !userChoices[targetUsername]) {
            socket.emit('adminActionError', 'Target user not found.');
            return;
        }
        if (targetUsername === requesterUsername) {
            socket.emit('adminActionError', 'You cannot make yourself admin again.');
            return;
        }
        if (userChoices[targetUsername].isAdmin) {
            socket.emit('adminActionError', `${targetUsername} is already the admin.`);
            return;
        }

        console.log(`[SERVER] Admin ${requesterUsername} is making ${targetUsername} the new admin.`);

        adminUsername = targetUsername;
        saveAdminConfig(); // Persist the change FIRST
        broadcastUpdates(); // Notify everyone (will sync flags based on new adminUsername)
        socket.emit('adminActionSuccess', `Successfully made ${targetUsername} the new admin.`);
    });

    socket.on('removeUser', (targetUsername) => {
        const requesterUsername = socket.username; // Use username associated with this specific socket connection

        if (!requesterUsername || requesterUsername !== adminUsername) {
            socket.emit('adminActionError', 'Only the current admin can perform this action.');
            return;
        }
        if (!targetUsername || !userChoices[targetUsername]) {
            socket.emit('adminActionError', 'Target user not found.');
            return;
        }
        if (targetUsername === requesterUsername) {
            socket.emit('adminActionError', 'Admin cannot remove themselves using this panel.');
            return;
        }

        console.log(`[SERVER] Admin ${requesterUsername} is removing user ${targetUsername}.`);

        const targetWasAdmin = userChoices[targetUsername].isAdmin;
        if (targetWasAdmin && Object.keys(userChoices).length <= 1) {
            console.log(`[SERVER] Denying removal of sole admin user ${targetUsername}.`);
            socket.emit('adminActionError', 'Cannot remove the only user while they are the admin.');
            return;
        }

        delete userChoices[targetUsername];

        if (targetWasAdmin) {
            console.warn(`[SERVER] Removed user ${targetUsername} was admin! Resetting admin.`);
            adminUsername = null;
            saveAdminConfig();
        }

        // Find and disconnect the removed user's socket(s)
        let disconnectedSocket = false;
        for (const [id, sock] of io.of("/").sockets) {
            if (sock.username === targetUsername) {
                console.log(`[SERVER] Disconnecting removed user ${targetUsername} (socket ${id})`);
                sock.disconnect(true);
                disconnectedSocket = true;
            }
        }

        broadcastUpdates();
        socket.emit('adminActionSuccess', `User ${targetUsername} removed successfully.`);
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
        const username = socket.username; // Use username associated with this specific socket connection
        // *** ADDED LOG ***
        console.log(`[SERVER] User disconnect initiated: ${username || 'unregistered'} (${socket.id}), Reason: ${reason}`);

        if (username && userChoices[username]) {
            // Check if other sockets exist for this username
            let otherSocketExists = false;
            for (const [id, sock] of io.of("/").sockets) {
                // Check if another socket exists with the same username but different ID
                if (sock.username === username && sock.id !== socket.id) {
                    otherSocketExists = true;
                    break;
                }
            }

            if (!otherSocketExists) {
                console.log(`[SERVER] Last socket for ${username} disconnected. Removing user.`);
                const wasAdmin = userChoices[username].isAdmin;
                delete userChoices[username];

                if (wasAdmin) {
                    console.log(`[SERVER] Admin ${username} disconnected.`);
                    adminUsername = null; // Reset admin if the admin disconnects
                    console.log("[SERVER] Admin disconnected, resetting admin tracking.");
                    saveAdminConfig(); // Persist null admin state
                }
                broadcastUpdates(); // Broadcast removal and potential admin status change
            } else {
                console.log(`[SERVER] User ${username} disconnected, but other sockets remain.`);
            }

        } else {
            console.log(`[SERVER] Unregistered or already removed user disconnected: ${socket.id}`);
        }
    });
});

// --- Initialize Admin Config & Start Server ---
loadAdminConfig(); // Load config (including appearance) before starting server
server.listen(port, () => {
    console.log(`[SERVER] ✨ Starlight Glimmer Battle Royal server running on http://localhost:${port}`);
    console.log(`[SERVER] ✨ Admin 'vs' string available at http://localhost:${port}/vs`);
    if (adminUsername) console.log(`[SERVER] ✨ Current Admin (on start): ${adminUsername}`);
    else console.log(`[SERVER] ✨ No admin assigned. First user to register will be admin.`);
    console.log(`[SERVER] ✨ Initial Appearance:`, currentAppearance);
});