import express from "express";
import cors from "cors";
import { trackGame, isValidGameId } from "./tracker";
import { VALID_COLORS } from "./constants";
import { sendTurnAlert } from "./notifier";

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Terraforming Mars Turn Notifier backend is running.");
});

// Game ID extractor helper
function extractGameId(input: string): string | null {
  const match = input.match(/id=([a-zA-Z0-9]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9]{8,}$/.test(input)) return input;
  return null;
}

app.post("/track", async (req, res) => {
  console.log("[BACKEND] /track called with:", req.body);
  let { gameId, playerColor, discordUserId } = req.body;

  // Validate fields present
  if (!gameId || !playerColor || !discordUserId) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  // Extract game ID (accept link, partial, or ID)
  gameId = extractGameId(gameId);
  if (!gameId) {
    return res.status(400).json({ error: "Could not extract game ID from input." });
  }

  // Validate color
  if (!VALID_COLORS.includes(playerColor)) {
    return res.status(400).json({ error: `Invalid player color "${playerColor}".` });
  }

  // Validate discordUserId (basic format)
  if (!/^\d{17,20}$/.test(discordUserId)) {
    return res.status(400).json({ error: "Invalid Discord user ID." });
  }

  // Check if game exists
  const validGame = await isValidGameId(gameId);
  if (!validGame) {
    return res.status(400).json({ error: "Game link or ID is invalid or does not exist." });
  }

  // Register tracking
  try {
    await trackGame(gameId, playerColor, discordUserId);
    await sendTurnAlert(
    discordUserId,
    gameId,
    playerColor,
    `------------------------------------------
✅ Tracking started for game **${gameId}** as **${playerColor}**!
You'll get a DM when it's your turn.
------------------------------------------

`
  );
    res.status(200).json({ message: "Game tracking started." });
  } catch (err) {
    await sendTurnAlert(
      discordUserId,
      gameId,
      playerColor,
      `------------------------------------------
❌ There was a problem setting up tracking for game **${gameId}** as **${playerColor}**.
Please try again later.
------------------------------------------

`
    );
    res.status(500).json({ error: "Failed to start tracking. Try again later." });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
