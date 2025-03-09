const { Client, GatewayIntentBits } = require("discord.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
const fs = require("fs");
const express = require("express");

// Load environment variables
dotenv.config();

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Load system instruction from a file
const systemInstruction = fs.readFileSync("./systemInstruction.txt", "utf-8");

// When bot is ready
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// When a new message is received
client.on("messageCreate", async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Only respond when mentioned
  if (!message.mentions.has(client.user.id)) return;

  // Remove mention from prompt
  const prompt = message.content.replace(/<@!?\d+>/g, "").trim();

  // Exit if prompt is empty
  if (!prompt) return;

  let responseMessage;

  try {
    // Send initial "generating" message
    responseMessage = await message.reply("Generating response...");

    // Build the full prompt with the system instruction
    const fullPrompt = `${systemInstruction}\n\nUser's Message: ${prompt}`;

    // Generate AI response
    const result = await model.generateContent(fullPrompt);
    const aiResponse = result.response.text();

    // Edit the initial message with the AI response
    await responseMessage.edit(aiResponse);
  } catch (error) {
    console.error("Error:", error);

    if (responseMessage) {
      await responseMessage.edit("Sorry, I encountered an error processing your request.");
    } else {
      message.reply("Sorry, I encountered an error processing your request.");
    }
  }
});

// Start web server to keep bot alive
const app = express();
const port = process.env.PORT || 3000;

app.get("/", (_, res) => res.send("Bot is running!"));
app.listen(port, "0.0.0.0", () =>
  console.log(`Web server running on port ${port}`),
);

// Login to Discord
client.login(process.env.DISCORD_BOT_TOKEN);
