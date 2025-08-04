import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Interaction, Partials, MessageFlags } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const GUILD_ID = process.env.DISCORD_GUILD_ID!;
const BACKEND_ROOT = process.env.BACKEND_URL || "http://localhost:4000";
const BACKEND_URL = `${BACKEND_ROOT}/track`;

const VALID_COLORS = [
  "red", "green", "yellow", "blue", "black",
  "purple", "orange", "pink"
];

function extractGameId(input: string): string | null {
  // Try to find id=XXXXXX anywhere in the string
  const match = input.match(/id=([a-zA-Z0-9]+)/);
  if (match) return match[1];

  // Otherwise, check if the input looks like an ID (alphanumeric, usually length 8+)
  if (/^[a-zA-Z0-9]{8,}$/.test(input)) return input;

  return null; // Not a valid ID
}


// 1. Register slash commands
async function registerSlashCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('track')
      .setDescription('Track your turns for a Terraforming Mars game!')
      .addStringOption(opt =>
        opt.setName('game')
          .setDescription('Game link or game ID')
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName('color')
          .setDescription('Your player color')
          .setRequired(true))
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN!);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log('✅ Slash command registered!');
}

// 2. Start bot
const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

bot.once("ready", async () => {
  console.log(`🤖 Discord bot ready as ${bot.user?.tag}`);
  await registerSlashCommands();
});

// 3. Handle /track
bot.on("interactionCreate", async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "track") {
    const gameInput = interaction.options.getString("game", true);
    const color = interaction.options.getString("color", true).toLowerCase();
    const discordUserId = interaction.user.id;

    // Validate color locally
    if (!VALID_COLORS.includes(color)) {
      await interaction.reply({
        content: `❌ Invalid color "${color}".`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Use improved extractor
    const gameId = extractGameId(gameInput);

    if (!gameId) {
      await interaction.reply({
        content: "❌ Could not extract game ID from your input. Please check your link or ID.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // POST to backend
    try {
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          playerColor: color,
          discordUserId,
        }),
      });
      const data = await response.json();

      if (response.ok) {
        await interaction.reply({
          content: `🛰️ Terraforming Mars Turn Tracker
------------------------------------------
You're now set up for game **${gameId}** as **${color}**!
We'll send you a confirmation DM and notify you when it's your turn. Good luck! 🚀
------------------------------------------`
        });
      } else {
        await interaction.reply({
          content: `❌ Could not start tracking: ${data.error || "Unknown error."}`,
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (err) {
      await interaction.reply({
        content: "❌ Server error, try again later.",
        flags: MessageFlags.Ephemeral
      });
    }
  }
});

bot.login(process.env.DISCORD_BOT_TOKEN);
