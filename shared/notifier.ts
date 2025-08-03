// shared/notifier.ts
import { Client } from "discord.js";

export async function sendTurnAlert(bot: Client, discordUserId: string, gameId: string, color: string, message: string) {
  try {
    const user = await bot.users.fetch(discordUserId);
    if (!user) throw new Error("User not found");

    const gameLink = `https://terraforming-mars.herokuapp.com/game?id=${gameId}`;

    await user.send({
      content: message
    });

    console.log(`✅ Alert sent to ${user.username}`);
  } catch (err) {
    console.error(`❌ Failed to DM ${discordUserId}:`, err);
  }
}
