import 'dotenv/config';
import { Client, Events, GatewayIntentBits, Guild, IntentsBitField } from 'discord.js';
// const wait = require('node:timers/promises').setTimeout;
import wait from 'timers/promises';

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
			await interaction.reply("hey from bot")
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

	if (message.content === 'ping') {
		await message.reply('Pong!');
		await message.react('😏');
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
