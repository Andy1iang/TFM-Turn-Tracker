import { Client, GatewayIntentBits, Partials } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const bot = new Client({
  intents: [GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel], // needed for DMs
});

bot.login(process.env.DISCORD_BOT_TOKEN);

export async function sendTurnAlert(
  discordUserId: string,
  gameId: string,
  color: string,
  message: string
) {
  try {
    const user = await bot.users.fetch(discordUserId);
    if (!user) throw new Error("User not found");

    await user.send({
      content: message
    });

    console.log(`✅ Alert sent to ${user.username}`);
  } catch (err) {
    console.error(`❌ Failed to DM ${discordUserId}:`, err);
  }
}
