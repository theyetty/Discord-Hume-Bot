# Hume AI Chatbot

This is a chatbot which integrates with Hume AI API and Discord to have a conversational AI system in Discord voice channels.

## How it works

The bot uses the Discord.js library to connect to the Discord API and the Hume AI API 
https://www.hume.ai/ 

Hume allows for real-time audio processing and understanding. It can be used to detect emotions, understand intent, and more.

It uses the OpusScript library to handle the audio stream and the WebSocket library to connect to the Hume API.

## Example Video
[![Example](https://img.youtube.com/vi/wBLXWomGG8M/0.jpg)](https://www.youtube.com/watch?v=wBLXWomGG8M)

## Getting Started

1. Clone the repository
2. Run `npm install`
3. Copy .env.example to .env
4. Fill out the .env with your Hume API key and Discord bot token
5. Run `npm start`
6. Type `!join` in a text channel in your server and the bot will join the voice channel you are in
7. Type `!leave` for the bot to leave the voice channel


## What you need to do in Hume

1. Create an account at https://www.hume.ai/
2. Create a new app and get your API key
3. Go to Empathici Voice Interface -> Configurations and create a new configuration.
4. Choose EVI 2
5. Select a preset voice or custom voice
6. Choose an LLM and System Prompt
7. Give it a sensible name
8. Copy the configuration ID and put it in the .env

## How to create a Discord Bot

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Give it a sensible name
4. Go to the Bot tab
5. Click "Add Bot"
6. Copy the token and put it in the .env
7. Go to the OAuth2 tab
8. Select "bot" and "applications.commands" scopes
9. Copy the URL and paste it into your browser to invite the bot to your server
10. Copy the Client ID and put it in the .env
11. Go to the Bot tab
12. Click "Copy" to copy the token
13. Paste it into the .env
14. Ensure the bot has the permissions below
15. The bot needs the intents Guilds, Guilds Voice States, Guild Messages, and Message Content

## Required Discord Bot Permissions

Ensure the bot has the following permissions in your Discord server:

1. Connect
2. Speak
3. View Channels
4. Send Messages
5. Read Message History
6. Use Voice Activity

You can set these permissions when inviting the bot to your server or by adjusting the bot's role permissions in your server settings.

## Troubleshooting

1. If the bot is not connecting to Hume, check that you have set the correct configuration ID in the .env
2. The bot will play a sound when it recognises your message and again when it understands you, if you do not hear this sound it did not understand you
3. You can interupt the bot, but please note after the sound its heard you it could take a few seconds to respond so be careful not to interupt it or things will get cut off, this is a limitation of voice bots right now
4. The bot will timeout based on the Inactivity Timeout set in the configuration, it will attempt to reconnect

