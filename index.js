require("dotenv/config");

const { Collection } = require("@discordjs/collection");
const { readdir } = require("fs/promises");
const { join } = require("path");
const { Client } = require("guilded.js");

const client = new Client({ token: process.env.TOKEN });
const prefix = process.env.PREFIX;
const commands = new Collection();

client.on("messageCreated", async (msg) => {
    if (!msg.content.startsWith(prefix)) return;
    let [commandName, ...args] = msg.content.slice(prefix.length).trim().split(/ +/);
    commandName = commandName.toLowerCase();

    const command = commands.get(commandName) ?? commands.find((x) => x.aliases?.includes(commandName));
    if (!command) return;

    try {
        await command.execute(msg, args);
    } catch (e) {
        void client.messages.send(msg.channelId, "There was an error executing that command!");
        void console.error(e);
    }
});

client.on("rolesUpdated", async (updatedMembers, oldMembers) => {
    // client.messages.send("fb0d841f-cef3-4218-b031-304e1aa1bb21", "Announcement channel identified!");
    const announcementChannelId = "fb0d841f-cef3-4218-b031-304e1aa1bb21"; // Replace with your actual channel ID
    console.log(`Set announcement channel ${announcementChannelId}`)
    const roles = {
        copper: "23794514",
        silver: "23794513",
        gold: "23794500"
    };

    // Create a string from the roles object to make it readable
    let rolesString = Object.entries(roles).map(([roleName, roleId]) => `${roleName}: ${roleId}`).join('\n');

    // Print the formatted string to the console
    console.log(`Set roles:\n${rolesString}`);

    // Map old members by userId for easy access
    const oldMembersMap = new Map(oldMembers.map(member => [member.userId, member.roleIds]));

    updatedMembers.members.forEach(member => {
        const oldRoleIds = oldMembersMap.get(member.userId) || [];

        // Function to detect role changes
        function detectRoleChange(oldRoleIds, newRoleIds, roleId) {
            const hadRole = oldRoleIds.includes(roleId);
            const hasRole = newRoleIds.includes(roleId);
            if (hadRole && !hasRole) {
                return -1; // Lost role
            } else if (!hadRole && hasRole) {
                return 1; // Gained role
            }
            return 0; // No change
        }

        // Check each role for changes and send messages accordingly
        for (const [tier, roleId] of Object.entries(roles)) {
            const change = detectRoleChange(oldRoleIds, member.roleIds, roleId);
            if (change === 1) {
                client.messages.send("fb0d841f-cef3-4218-b031-304e1aa1bb21", `${member.userId} has just obtained the ${tier} role!`);
                // client.channels.get(announcementChannelId).send(`${member.userId} has just obtained the ${tier} role!`);
            } else if (change === -1) {
                client.messages.send("fb0d841f-cef3-4218-b031-304e1aa1bb21", `${member.userId} has just lost the ${tier} role.`);
                // client.channels.get(announcementChannelId).send(`${member.userId} has just lost the ${tier} role.`);
            }
        }
    });
});

// client.on("debug", console.log);
client.on("error", console.log);
client.on("ready", () => console.log("Guilded bot is ready!"));
client.on("exit", () => console.log("Disconnected!"));

void (async () => {
    // read the commands dir and have the file extensions.
    const commandDir = await readdir(join(__dirname, "commands"), { withFileTypes: true });

    // go through all the files/dirs scanned from the readdir, and make sure we only have js files
    for (const file of commandDir.filter((x) => x.name.endsWith(".js"))) {
        console.log(file.name);
        const command = require(join(__dirname, "commands", file.name));
        commands.set(command.name, command);
    }

    client.login();
})();
