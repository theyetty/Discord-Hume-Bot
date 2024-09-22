require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { initializeDiscordClient } = require('./src/discordClient');
const { log } = require('./src/utils');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.once('ready', () => {
    log('Discord bot is ready!');
});

initializeDiscordClient(client);

client.login(process.env.DISCORD_TOKEN);
