// mars-turn-backend/src/tracker.ts

import axios from "axios";

// --- Game state and type definitions ---
interface TrackedGame {
  gameId: string;
  colorToDiscordId: Record<string, string>;
  lastWaitingFor: Set<string>;
}

// The central registry of tracked games
const trackedGames: Record<string, TrackedGame> = {};

// --- Notification callback type ---
export type TurnAlertNotifier = (discordUserId: string, gameId: string, color: string, message: string) => Promise<void>;

// --- Main tracker logic ---

export async function trackGame(
  gameId: string,
  color: string,
  discordUserId: string,
  sendTurnAlert: TurnAlertNotifier // Notification function passed from bot process
) {
  let game = trackedGames[gameId];
  if (!game) {
    game = {
      gameId,
      colorToDiscordId: {},
      lastWaitingFor: new Set(),
    };
    trackedGames[gameId] = game;
    pollGame(gameId, sendTurnAlert);
  }
  game.colorToDiscordId[color] = discordUserId;

  // Optionally send confirmation here if called from bot
  await sendTurnAlert(discordUserId, gameId, color, `✅ Tracking started for game **${gameId}** as **${color}**! You'll get a DM when it's your turn.`);
}

async function pollGame(gameId: string, sendTurnAlert: TurnAlertNotifier) {
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
            await sendTurnAlert(userId, gameId, color, `🔔 It's your turn in game **${gameId}** as **${color}**!\nGame link: https://terraforming-mars.herokuapp.com/game/${gameId}`);
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
