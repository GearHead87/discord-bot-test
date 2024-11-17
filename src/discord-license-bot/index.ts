// src/index.ts
import {
	Client,
	GatewayIntentBits,
	Events,
	AttachmentBuilder,
	Message,
	IntentsBitField,
} from 'discord.js';
import XLSX from 'xlsx';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';
import fetch from 'node-fetch';
import {
	VideoMetadata,
	LicenseAnalysis,
	Platform,
	VideoExtractors,
	MetadataFetchers,
	ProcessedResult,
	TwitterApiResponse,
	TiktokApiResponse,
	YoutubeApiResponse,
} from './types.js';

// Initialize Discord Client
const client = new Client({
	intents: [
		IntentsBitField.Flags.Guilds,
		IntentsBitField.Flags.GuildMembers,
		IntentsBitField.Flags.GuildMessages,
		IntentsBitField.Flags.MessageContent,
	],
});

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// URL extractors
const extractors: VideoExtractors = {
	youtube: (url: string): string | null => {
		const regExp = /^.*(youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#\&\?]*).*/;
		const match = url.match(regExp);
		return match && match[2].length === 11 ? match[2] : null;
	},

	tiktok: (url: string): string | null => {
		const regex = /\/video\/(\d+)/;
		const match = url.match(regex);
		return match ? match[1] : null;
	},

	twitter: (url: string): string | null => {
		const regex = /\/status\/(\d+)/;
		const match = url.match(regex);
		return match ? match[1] : null;
	},
};

// API fetchers
const fetchers: MetadataFetchers = {
	youtube: async (videoId: string): Promise<VideoMetadata> => {
		const response = await fetch(
			`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${process.env.YOUTUBE_API_KEY}&part=snippet`
		);
		const data = (await response.json()) as YoutubeApiResponse;
		return {
			title: data?.items?.[0]?.snippet?.title ?? '',
			description: data?.items?.[0]?.snippet?.description ?? '',
		};
	},

	tiktok: async (videoId: string): Promise<VideoMetadata> => {
		const response = await fetch(`https://api.tiktok.com/v2/videos/${videoId}`, {
			headers: {
				Authorization: `Bearer ${process.env.TIKTOK_ACCESS_TOKEN}`,
			},
		});
		const data = (await response.json()) as TiktokApiResponse;
		return {
			title: data?.title ?? '',
			description: data?.description ?? '',
		};
	},

	twitter: async (tweetId: string): Promise<VideoMetadata> => {
		const response = await fetch(
			`https://api.twitter.com/2/tweets/${tweetId}?expansions=attachments.media_keys&media.fields=url,duration_ms`,
			{
				headers: {
					Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
				},
			}
		);
		const data = (await response.json()) as TwitterApiResponse;
		return {
			title: data?.data?.text ?? '',
			description: data?.data?.text ?? '',
		};
	},
};

// Type guard for Platform
function isPlatform(platform: string): platform is Platform {
	return ['youtube', 'tiktok', 'twitter'].includes(platform);
}

// Determine platform from URL
function determinePlatform(url: string): Platform | null {
	if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
	if (url.includes('tiktok.com')) return 'tiktok';
	if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
	return null;
}

// Analyze licensing with Gemini
async function analyzeLicensingWithGemini(metadata: VideoMetadata): Promise<LicenseAnalysis> {
	const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

	const prompt = `
     Analyze this video's title and description for licensing information:
      Title: ${metadata.title}
      Description: ${metadata.description}
      
      Please carefully analyze for:
      1. Explicit license types (e.g., Creative Commons)
      2. Licensing contact information or instructions (e.g., email, phone numbers, submission links).
      3. Mentions of licensing services or companies (e.g., ViralHog, Newsflare).
      4. Commercial licensing availability (explicitly or implied).
      5. Rights management companies or agencies mentioned (if any).
      6. Any specific instructions about usage rights or licensing process (e.g., whether attribution is required).
      
      Pay special attention to:
      - Email addresses containing "licensing" or similar terms
      - Phrases like "to license this content" or "for licensing"
      - Company names followed by licensing instructions
      - Any mention of content licensing platforms or services
      
      Format your response as a JSON object with these fields:
     {
  		"hasExplicitLicense": boolean,            // true if any form of licensing is mentioned
  		"licenseType": string,                    // e.g., "Commercial License through ViralHog", "Creative Commons"
  		"canUseCommercially": boolean,            // true if commercial licensing is available
  		"requiresAttribution": boolean,           // true if attribution is required
  		"licensingContact": string | null,        // licensing contact information if provided
  		"licensingCompany": string | null,        // company handling licensing if mentioned
  		"notes": string                           // additional details about licensing terms, process, or ambiguities
	}
    `;

	const result = await model.generateContent(prompt);
	const response = await result.response;
	return JSON.parse(
		response
			.text()
			.replace(/```json/g, '')
			.replace(/```/g, '')
	);
}

// Process Excel file
async function processExcelFile(buffer: ArrayBuffer): Promise<Buffer> {
	const workbook = XLSX.read(buffer);
	const worksheet = workbook.Sheets[workbook.SheetNames[0]];
	// Get data as arrays with header: 1 option
	const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

	const results: ProcessedResult[] = [];

	// Process each row, assuming first column contains URLs
	for (const row of data) {
		const url = row[0]; // Get URL from first column
		if (!url || typeof url !== 'string') continue;

		try {
			const platform = determinePlatform(url);
			if (!platform || !isPlatform(platform)) {
				results.push({
					url,
					error: 'Unsupported platform',
				});
				continue;
			}

			const videoId = extractors[platform](url);
			if (!videoId) {
				results.push({
					url,
					error: 'Invalid video URL',
				});
				continue;
			}

			const metadata = await fetchers[platform](videoId);
			const licenseAnalysis = await analyzeLicensingWithGemini(metadata);

			results.push({
				url,
				platform,
				videoId,
				title: metadata.title,
				// description: metadata.description,
				...licenseAnalysis,
			});
		} catch (error) {
			results.push({
				url,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}

	// Create new workbook with results
	const newWorkbook = XLSX.utils.book_new();
	const newWorksheet = XLSX.utils.json_to_sheet(results);
	XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Analysis Results');

	return XLSX.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

// Discord bot event handlers
client.once(Events.ClientReady, () => {
	console.log('Discord bot is ready!');
});

client.on(Events.MessageCreate, async (message: Message) => {
	if (message.author.bot) return;

	const attachment = message.attachments.first();
	if (!attachment || !attachment.name?.endsWith('.xlsx')) {
		await message.reply('Please upload an Excel file (.xlsx)');
		return;
	}

	try {
		await message.reply('Processing your Excel file... This may take a few minutes.');

		// Download and process the Excel file
		const response = await fetch(attachment.url);
		const buffer = await response.arrayBuffer();

		const resultBuffer = await processExcelFile(buffer);

		// Send the results back
		const resultAttachment = new AttachmentBuilder(resultBuffer, {
			name: 'license-analysis-results.xlsx',
		});

		await message.reply({
			content: 'Here are your video license analysis results:',
			files: [resultAttachment],
		});
	} catch (error) {
		console.error('Error processing Excel file:', error);
		await message.reply(
			'An error occurred while processing your Excel file. Please try again.'
		);
	}
});

// Start the bot
client.login(process.env.DISCORD_TOKEN);
