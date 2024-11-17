import { REST, Routes } from 'discord.js';
import 'dotenv/config';

const commands = [
	{
		name: 'checker',
		description: 'Clip Checker',
	},
];

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN as string);

try {
	console.log('Started refreshing Guild (/) commands.');
	await rest.put(
		Routes.applicationGuildCommands(
			process.env.CLIENT_ID as string,
			process.env.GUILD_ID as string
		),
		{
			body: commands,
		}
		// Routes.applicationCommands(process.env.CLIENT_ID as string),
		// { body: "" }
	);
	console.log('Stash commands were registered successfully');
} catch (error) {
	console.log(`There was an error ${error}`);
}
