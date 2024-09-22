// src/discordClient.js
const { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus } = require('@discordjs/voice');
const { setupHumeAI } = require('./humeAIClient');
const { log } = require('./utils');
const { TARGET_USER_ID } = require('./config');

function initializeDiscordClient(client) {
    client.on('voiceStateUpdate', async (oldState, newState) => {
        if (newState.member?.id === TARGET_USER_ID && newState.channel && (!oldState.channel || oldState.channel.id !== newState.channel.id)) {
            const connection = joinVoiceChannel({
                channelId: newState.channel.id,
                guildId: newState.guild.id,
                adapterCreator: newState.guild.voiceAdapterCreator,
            });
    
            connection.on(VoiceConnectionStatus.Ready, () => {
                log(`Joined new voice channel of user ${TARGET_USER_ID}`);
                console.log('hello')
                setupHumeAI(connection, client);
            });
        }
    });

    client.on('messageCreate', async (message) => {
        if (message.content === '!join' && message.member.voice.channel) {
            const connection = joinVoiceChannel({
                channelId: message.member.voice.channel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });
    
            connection.on(VoiceConnectionStatus.Ready, () => {
                log(`Joined voice channel of user ${message.member.id}`);
                setupHumeAI(connection);
            });
        } else if (message.content === '!join') {
            message.reply('You need to be in a voice channel to use this command.');
        }
    
        // New !leave command
        if (message.content === '!leave' && message.member.voice.channel) {
            const connection = getVoiceConnection(message.guild.id);
            if (connection) {
                connection.destroy(); // Leave the voice channel
                log(`Left voice channel of user ${message.member.id}`);
            } else {
                message.reply('I am not in a voice channel.');
            }
        } else if (message.content === '!leave') {
            message.reply('You need to be in a voice channel to use this command.');
        }
    });
        
}

module.exports = { initializeDiscordClient };
