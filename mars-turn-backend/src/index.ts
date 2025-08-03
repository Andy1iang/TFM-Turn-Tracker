// src/index.ts
import express from "express";
import cors from "cors";
import { trackGame, isValidGameId } from "./tracker";
import { VALID_COLORS } from "./constants";
// import { sendTurnAlert } from "../../shared/notifier";
// import { bot } from "../../mars-turn-bot/src/index";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Terraforming Mars Turn Notifier backend is running.");
});

// app.post("/track", async (req, res) => {
//   app.post("/track", async (req, res) => {
//   const { gameId, playerColor, discordUserId } = req.body;

//   // Very basic field presence check (assume validated by bot)
//   if (!gameId || !playerColor || !discordUserId) {
//     return res.status(400).json({ error: "Missing required fields." });
//   }

//   try {
//     // Register the game tracking
//     await trackGame(gameId, playerColor, discordUserId);
//     res.status(200).json({ message: "Game tracking started." });
//   } catch (err) {
//     res.status(500).json({ error: "Failed to start tracking. Try again later." });
//   }
//   });
// });


app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
