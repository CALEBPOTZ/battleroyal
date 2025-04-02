// server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const fs = require('fs'); // File System module

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

// --- Configuration ---
const ADMIN_CONFIG_FILE = path.join(__dirname, 'admin_config.json');
const DEFAULT_PFP = 'https://picsum.photos/seed/default/50'; // Default PFP URL

// --- Admin Tracking ---
let adminUsername = null; // Loaded from config

// --- Data Storage (In-Memory) ---
let userChoices = {}; // Stores { "Username1": { word: "Word1", pfpUrl: "url1", isAdmin: false }, ... }

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
                 adminUsername = null; // Ensure it's null if file exists but property doesn't
            }
        } else {
            console.log('[SERVER] Admin config file not found. First registered user will be admin.');
            adminUsername = null; // Ensure it's null if file doesn't exist
        }
    } catch (err) {
        console.error('[SERVER] Error loading admin config:', err);
         adminUsername = null; // Reset on error
    }
}

function saveAdminConfig() {
    console.log(`[SERVER] Attempting to save admin config. Current admin: ${adminUsername}`);
    try {
        const config = { adminUsername: adminUsername };
        fs.writeFileSync(ADMIN_CONFIG_FILE, JSON.stringify(config, null, 2));
        console.log(`[SERVER] Admin user saved to config: ${adminUsername}`);
    } catch (err) {
        console.error('[SERVER] Error saving admin config:', err);
    }
}

// Function to ensure isAdmin flags are correct based on adminUsername
function syncAdminStatus() {
    Object.keys(userChoices).forEach(username => {
        if (userChoices[username]) {
             userChoices[username].isAdmin = (username === adminUsername);
        }
    });
}

// Broadcasts the current state to all clients
function broadcastUpdates() {
    syncAdminStatus(); // Ensure isAdmin flags are correct before broadcasting
    console.log("[SERVER] Broadcasting 'updateChoices':", Object.keys(userChoices)); // Log keys for brevity
    io.emit('updateChoices', userChoices);
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
io.on('connection', (socket) => {
    console.log(`[SERVER] User connected: ${socket.id}`);

    // Send current state immediately on connection
    console.log(`[SERVER] Emitting 'initialState' to ${socket.id}:`, Object.keys(userChoices)); // Log keys
    socket.emit('initialState', userChoices);

    // Handle user registration attempt
    socket.on('registerUser', (username) => {
        console.log(`[SERVER] Registration attempt for username: '${username}' from socket ${socket.id}`);
        const trimmedUsername = username ? username.trim() : null;

        if (!trimmedUsername) {
            console.log(`[SERVER] Registration failed for ${socket.id}: Username empty.`);
            socket.emit('registrationError', 'Username cannot be empty.');
            return;
        }

        // Handle reconnection / existing user
        if (userChoices[trimmedUsername]) {
            console.log(`[SERVER] User ${trimmedUsername} is reconnecting or already exists.`);
            socket.username = trimmedUsername; // Associate socket with existing user
            const isAdmin = (trimmedUsername === adminUsername);
             // Ensure the existing data reflects correct admin status (might have changed while disconnected)
             userChoices[trimmedUsername].isAdmin = isAdmin;
            console.log(`[SERVER] Re-associating socket ${socket.id} with ${trimmedUsername}. isAdmin: ${isAdmin}`);

            const successData = {
                username: trimmedUsername,
                isAdmin: isAdmin,
                initialData: userChoices // Send current full state
            };
            console.log(`[SERVER] Emitting 'registrationSuccess' (reconnect) to ${socket.id}`); // Don't log full data
            socket.emit('registrationSuccess', successData);
            // No broadcast needed for simple reconnect if state hasn't otherwise changed
            return;
        }

        // --- Register as a NEW user ---
        console.log(`[SERVER] Registering NEW user ${trimmedUsername} for socket ${socket.id}`);
        socket.username = trimmedUsername;
        let isNewUserAdmin = false;

        // Assign admin if none exists
        if (!adminUsername) {
            console.log(`[SERVER] No admin found. Assigning ${trimmedUsername} as first admin.`);
            adminUsername = trimmedUsername;
            isNewUserAdmin = true;
            saveAdminConfig(); // Persist
        } else {
            isNewUserAdmin = false;
            console.log(`[SERVER] Admin (${adminUsername}) already exists. ${trimmedUsername} is a regular user.`);
        }

        // Add user to choices
        userChoices[trimmedUsername] = {
            word: null,
            pfpUrl: DEFAULT_PFP,
            isAdmin: isNewUserAdmin
        };
        console.log(`[SERVER] Added ${trimmedUsername} to userChoices.`);

        const successData = {
            username: trimmedUsername,
            isAdmin: isNewUserAdmin,
            initialData: userChoices // Send the latest full state
        };
        console.log(`[SERVER] Emitting 'registrationSuccess' (new user) to ${socket.id}`);
        socket.emit('registrationSuccess', successData);

        // Broadcast updated choices because a new user joined
        broadcastUpdates();
    });

    // Listen for a user submitting their character choice
    socket.on('submitChoice', (data) => {
        const username = socket.username;
        const word = data.word ? data.word.trim() : null;

        if (username && userChoices[username] && word) {
            console.log(`[SERVER] ${username} chose: ${word}`);
            userChoices[username].word = word;
            broadcastUpdates(); // Will sync admin status
        } else if (!username) {
             console.log(`[SERVER] Socket ${socket.id} tried to submit choice without being registered.`);
             socket.emit('choiceError', 'Please register first.');
        } else if (username && userChoices[username] && !word) {
             socket.emit('choiceError', 'Please enter a character name.');
        } else {
             console.log(`[SERVER] Invalid choice scenario for user ${username}:`, data);
        }
    });

     // Handle profile updates (Only PFP update possible now)
    socket.on('updateProfile', (data) => {
        const username = socket.username;
        const newPfpUrl = data.pfpUrl ? data.pfpUrl.trim() : DEFAULT_PFP;

        if (!username || !userChoices[username]) {
            console.log(`[SERVER] Profile update failed: User ${username} not found.`);
            socket.emit('profileUpdateError', 'Cannot update profile. User not recognized.');
            return;
        }

        console.log(`[SERVER] Updating PFP for ${username}`);
        userChoices[username].pfpUrl = newPfpUrl;
        broadcastUpdates(); // Will sync admin status
        socket.emit('profileUpdateSuccess', 'Profile picture updated!');
    });

    // Handle Admin Action: Make another user admin
    socket.on('setAdmin', (targetUsername) => {
        const requesterUsername = socket.username;

        // Security Checks
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

        // Perform the change
        adminUsername = targetUsername; // Update admin tracking variable
        saveAdminConfig(); // Persist the change FIRST
        broadcastUpdates(); // Notify everyone (will sync flags based on new adminUsername)
        socket.emit('adminActionSuccess', `Successfully made ${targetUsername} the new admin.`);
    });

    // Handle Admin Action: Remove a user
    socket.on('removeUser', (targetUsername) => {
         const requesterUsername = socket.username;

        // Security Checks
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

        // Check if removing the sole admin
        const targetWasAdmin = userChoices[targetUsername].isAdmin;
        if(targetWasAdmin && Object.keys(userChoices).length <= 1) {
            console.log(`[SERVER] Denying removal of sole admin user ${targetUsername}.`);
            socket.emit('adminActionError', 'Cannot remove the only user while they are the admin.');
            return;
        }

        // Perform removal
        delete userChoices[targetUsername];

         // If the removed user WAS the admin (and not the only user), reset admin tracking
         if (targetWasAdmin) {
              console.warn(`[SERVER] Removed user ${targetUsername} was admin! Resetting admin.`);
              adminUsername = null;
              saveAdminConfig(); // Persist null admin
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

        broadcastUpdates(); // Broadcast after removal and potential disconnect
        socket.emit('adminActionSuccess', `User ${targetUsername} removed successfully.`);
    });


    // Handle disconnection
    socket.on('disconnect', (reason) => {
        const username = socket.username;
        console.log(`[SERVER] User disconnect initiated: ${username || 'unregistered'} (${socket.id}), Reason: ${reason}`);

        // Only process if the user was actually registered and still exists in choices
        if (username && userChoices[username]) {
            // Check if this is the LAST active socket for this username (difficult to track reliably without more state)
            // Simple approach: Assume disconnect means removal for now.
             const wasAdmin = userChoices[username].isAdmin;
             console.log(`[SERVER] Removing user ${username} from choices due to disconnect.`);
             delete userChoices[username];

             if (wasAdmin) {
                 console.log(`[SERVER] Admin ${username} disconnected.`);
                 const remainingUsers = Object.keys(userChoices);
                 if (remainingUsers.length === 0) {
                     console.log("[SERVER] No users left, resetting admin tracking.");
                     adminUsername = null;
                 } else {
                     console.log("[SERVER] Admin disconnected, other users remain. Resetting admin tracking.");
                     adminUsername = null; // Next new user becomes admin
                 }
                  saveAdminConfig(); // Persist the (potentially null) admin state
             }
             broadcastUpdates(); // Broadcast removal and potential admin status change

        } else {
             console.log(`[SERVER] Unregistered or already removed user disconnected: ${socket.id}`);
        }
    });
});

// --- Initialize Admin Config & Start Server ---
loadAdminConfig();
server.listen(port, () => {
    console.log(`[SERVER] ✨ Starlight Glimmer Battle Royal server running on http://localhost:${port}`);
    console.log(`[SERVER] ✨ Admin 'vs' string available at http://localhost:${port}/vs`);
    if (adminUsername) console.log(`[SERVER] ✨ Current Admin (on start): ${adminUsername}`);
    else console.log(`[SERVER] ✨ No admin assigned. First user to register will be admin.`);
});