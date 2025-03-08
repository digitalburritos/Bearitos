const { Client, GatewayIntentBits } = require("discord.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

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

// Function to save user conversations to a file
const saveConversationsToFile = () => {
  const filePath = path.join(__dirname, 'conversations.json');
  fs.writeFileSync(filePath, JSON.stringify(userConversations, null, 2));
};

// Function to load user conversations from a file (if exists)
const loadConversationsFromFile = () => {
  const filePath = path.join(__dirname, 'conversations.json');
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }
  return {};
};

// Load conversations on startup
let userConversations = loadConversationsFromFile();

// Function to update conversation history
const updateConversation = (userId, message) => {
  if (!userConversations[userId]) {
    userConversations[userId] = [];
  }

  userConversations[userId].push(message);
  saveConversationsToFile();  // Save updated conversations to file
};

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

  let responseMessage; // Declare variable for response message

  try {
    // Send initial "generating" message
    responseMessage = await message.reply("Generating response...");

    // Build the full prompt with the system instruction and previous user context
    const userHistory = userConversations[message.author.id] || [];
    const fullPrompt = `${systemInstruction}\n\nUser's Previous Messages:\n${userHistory.join("\n")}\n\nUser's New Message: ${prompt}`;

    // Generate AI response
    const result = await model.generateContent(fullPrompt);
    const aiResponse = result.response.text();

    // Update chat history
    updateConversation(message.author.id, prompt);
    updateConversation(message.author.id, aiResponse);

    // Edit the initial message with the AI response
    await responseMessage.edit(aiResponse);
  } catch (error) {
    console.error("Error:", error);

    // If responseMessage was sent, edit it to the error message
    if (responseMessage) {
      await responseMessage.edit("Sorry, I encountered an error processing your request.");
    } else {
      // If no response message was created, send a reply directly
      message.reply("Sorry, I encountered an error processing your request.");
    }
  }
});

// Start web server to keep bot alive
const express = require("express");
const app = express();

const port = process.env.PORT || 3000;  // Use the PORT variable from .env, fallback to 3000

app.get("/", (_, res) => res.send("Bot is running!"));
app.listen(port, "0.0.0.0", () =>
  console.log(`Web server running on port ${port}`),
);

// Login to Discord
client.login(process.env.DISCORD_BOT_TOKEN);
