// mars-turn-bot/src/index.ts

import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Interaction, Partials } from "discord.js";
import dotenv from "dotenv";
dotenv.config();
import { sendTurnAlert } from "../../shared/notifier"; // Shared notifier function

import { trackGame, isValidGameId } from "../../mars-turn-backend/src/tracker";
import { VALID_COLORS } from "../../mars-turn-backend/src/constants";

const CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const GUILD_ID = process.env.DISCORD_GUILD_ID!; // Fast for dev; remove for global later

// 1. Register slash commands (guild for fast update)
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
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), // Fast update for your dev/test server
    // Routes.applicationCommands(CLIENT_ID), // For global deployment
    { body: commands }
  );
  console.log('✅ Slash command registered!');
}

// 2. Start bot
export const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel], // needed for DMs
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

    // Validate color
    if (!VALID_COLORS.includes(color)) {
      await interaction.reply({ content: `❌ Invalid color "${color}".`, ephemeral: true });
      return;
    }

    // Extract gameId from URL if needed
    let gameId = gameInput;
    if (gameId.startsWith("http")) {
      const match = gameId.match(/[?&]id=([a-zA-Z0-9]+)/);
      if (!match) {
        await interaction.reply({ content: "❌ Could not extract game ID from link.", ephemeral: true });
        return;
      }
      gameId = match[1];
    }

    // Validate game
    if (!(await isValidGameId(gameId))) {
      await interaction.reply({ content: "❌ Invalid game link or ID.", ephemeral: true });
      return;
    }

    // Track game and send confirmation DM
    try {
      await trackGame(gameId, color, discordUserId, sendTurnAlert.bind(null, bot));
      await interaction.reply({
        content: `🛰️ Terraforming Mars Turn Tracker\n------------------------------------------\nYou're now set up for game **${gameId}** as **${color}**!\nWe'll DM you when it's your turn. Good luck! 🚀`
      });

    } catch (err) {
      await interaction.reply({
        content: "❌ Failed to start tracking. Try again later.",
        ephemeral: true
      });
    }
  }
});

bot.login(process.env.DISCORD_BOT_TOKEN);
