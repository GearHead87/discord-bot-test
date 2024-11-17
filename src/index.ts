import 'dotenv/config';
import { Client, Events, GatewayIntentBits, Guild, IntentsBitField } from 'discord.js';
// const wait = require('node:timers/promises').setTimeout;
import wait from 'timers/promises';
import fetch from 'node-fetch';

const client = new Client({
	intents: [
		// GatewayIntentBits.Guilds,
		// GatewayIntentBits.GuildMessages,
		// GatewayIntentBits.GuildMembers,
		// GatewayIntentBits.MessageContent,
		IntentsBitField.Flags.Guilds,
		IntentsBitField.Flags.GuildMembers,
		IntentsBitField.Flags.GuildMessages,
		IntentsBitField.Flags.MessageContent,
	],
});

client.on('ready', (c) => {
	console.log(`Logged in as ${c.user.tag}!`);
});

// Handle interactions with error catching
client.on(Events.InteractionCreate, async (interaction) => {
	try {
		if (!interaction.isChatInputCommand()) return;

		console.log(`Received command: ${interaction.commandName}`);
		if (interaction.commandName === 'hey') {
			await interaction.reply('hey from bot');
			// await interaction.deferReply({ ephemeral: true });
			// await wait.setTimeout(4_000);
			// await interaction.followUp('asdf');
		}
	} catch (error: any) {
		console.error('Error handling interaction:', error);

		// Handle expired interactions
		if (error.code === 10062) {
			console.log('Interaction expired');
			return;
		}
	}
});

client.on('messageCreate', async (message) => {
	console.log(message);
	if (message.author.bot) {
		return;
	}

	const attachment = message.attachments.first();
	// console.log(attachment);

	if (!attachment || !attachment.name?.endsWith('.xlsx')) {
		await message.reply('Please upload an Excel file (.xlsx)');
		return;
	}

	try {
		await message.reply('Processing your Excel file...');

		const response = await fetch(attachment.url);
		const file = await response.arrayBuffer()
		console.log(file);
	} catch (error) {
		console.error('Error processing Excel file:', error);
		await message.reply(
			'An error occurred while processing your Excel file. Please try again.'
		);
	}
});

// Global error handling
process.on('unhandledRejection', (error) => {
	console.error('Unhandled promise rejection:', error);
});

// Login with error handling
client.login(process.env.BOT_TOKEN).catch((error) => {
	console.error('Failed to login:', error);
	process.exit(1);
});
