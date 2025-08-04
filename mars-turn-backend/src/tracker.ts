import axios from "axios";
import { sendTurnAlert } from "./notifier"; // Use backend-local notifier!

// --- Game state and type definitions ---
interface TrackedGame {
  gameId: string;
  colorToDiscordId: Record<string, string>;
  lastWaitingFor: Set<string>;
  polling?: boolean; // Prevent multiple pollers per game
}

// The central registry of tracked games
const trackedGames: Record<string, TrackedGame> = {};

// --- Main tracker logic ---
export async function trackGame(
  gameId: string,
  color: string,
  discordUserId: string
) {
  let game = trackedGames[gameId];
  if (!game) {
    game = {
      gameId,
      colorToDiscordId: {},
      lastWaitingFor: new Set(),
      polling: false,
    };
    trackedGames[gameId] = game;
  }
  game.colorToDiscordId[color] = discordUserId;

  // Start polling if not running
  if (!game.polling) {
    game.polling = true;
    pollGame(gameId);
  }

  // Confirmation message will be sent by backend after calling this function
}

// --- Polling logic ---
async function pollGame(gameId: string) {
  const game = trackedGames[gameId];
  if (!game) return;

  try {
    while (trackedGames[gameId]) {
      const url = `https://terraforming-mars.herokuapp.com/api/waitingfor?id=${gameId}`;
      const { data } = await axios.get(url);

      if (data.result === "GO" && (!data.waitingFor || data.waitingFor.length === 0)) {
        // Notify all players game ended
        for (const [color, userId] of Object.entries(game.colorToDiscordId)) {
          await sendTurnAlert(userId, gameId, color, `🏁 The game **${gameId}** has ended! Play again soon!`);
        }
        delete trackedGames[gameId];
        break;
      }

      const currentWaitingFor = new Set<string>(data.waitingFor || []);

      // Notify for new colors in waitingFor
      for (const color of currentWaitingFor) {
        if (!game.lastWaitingFor.has(color)) {
          const userId = game.colorToDiscordId[color];
          if (userId) {
            const message = 
`------------------------------------------
🔔 It's your turn in game **${gameId}** as **${color}**!
Game link: https://terraforming-mars.herokuapp.com/game?id=${gameId}
------------------------------------------

`;
            await sendTurnAlert(userId, gameId, color, message);
          }
        }
      }

      // Update lastWaitingFor for next loop
      game.lastWaitingFor = currentWaitingFor;

      await new Promise(res => setTimeout(res, 5000));
    }
  } catch (err) {
    console.error(`[${gameId}] Polling error:`, err);
    delete trackedGames[gameId];
  }
}

// --- Game validation utility ---
export async function isValidGameId(gameId: string): Promise<boolean> {
  try {
    const url = `https://terraforming-mars.herokuapp.com/api/waitingfor?id=${gameId}`;
    const { data } = await axios.get(url, { timeout: 3000 });
    return typeof data === "object" && typeof data.result === "string";
  } catch {
    return false;
  }
}
