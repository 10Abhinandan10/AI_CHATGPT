import express from "express";
import ImageKit from "imagekit";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Chat from "./models/chat.js";
import UserChats from "./models/userChats.js";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import userChats from "./models/userChats.js";

dotenv.config();

const port = process.env.PORT || 3000;
const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json()); // Correct use of express.json() middleware

// MongoDB connection
const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.log(err);
  }
};

// ImageKit configuration
const imagekit = new ImageKit({
  urlEndpoint: process.env.REACT_IMAGE_KIT_ENDPOINT,
  publicKey: process.env.REACT_IMAGE_KIT_PUBLIC_KEY,
  privateKey: process.env.REACT_IMAGE_KIT_PRIVATE_KEY,
});

// Routes

// ImageKit authentication parameters
app.get("/api/upload", (req, res) => {
  const result = imagekit.getAuthenticationParameters();
  console.log("ImageKit Authentication Success");
  res.send(result);
});

/* Test endpoint to verify backend authentication with Clerk
app.get("/api/test", ClerkExpressRequireAuth(), (req, res) => {
  const userId = req.auth.userId;
  console.log(userId);
  res.send("Success!");
});
*/


// Endpoint to create a new chat
app.post("/api/chats", ClerkExpressRequireAuth(), async (req, res) => {
  const userId = req.auth.userId;
  const { text } = req.body;

  try {
    // CREATE A NEW CHAT
    const newChat = new Chat({
      userId: userId,
      history: [{ role: "user", parts: [{ text }] }],
    });

    const savedChat = await newChat.save();

    // CHECK IF USERCHATS EXISTS
    const userChats = await UserChats.find({ userId: userId });

    if (!userChats.length) {
      const newUserChats = new UserChats({
        userId: userId,
        chats: [
          {
            _id: savedChat._id,
            title: text.substring(0, 40),
          },
        ],
      });
      await newUserChats.save();
    } else {
      await UserChats.updateOne(
        { userId: userId },
        {
          $push: {
            chats: {
              _id: savedChat._id,
              title: text.substring(0, 40),
            },
          },
        }
      );
    }

    res.status(201).send(savedChat._id);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error creating chat!");
  }
});

app.get("/api/userchats", ClerkExpressRequireAuth(), async (req,res)=>{

  const userId = req.auth.userId;
  try {

    const userChats = await UserChats.find({userId})

    res.status(200).send(userChats[0].chats);
    
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching userchats!");
  }
});

app.get("/api/chats/:id", ClerkExpressRequireAuth(), async (req,res)=>{

  const userId = req.auth.userId;
  try {

    const chat = await Chat.findOne({_id: req.params.id, userId});
    
    if (!chat) {
      return res.status(404).json({ message: "Chat not found!" });
    }

    res.status(200).send(chat);
    
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching chat!");
  }
});

app.put("/api/chats/:id", ClerkExpressRequireAuth(), async (req,res)=>{

  const userId = req.auth.userId;
  const {question, answer, img} = req.body;

  const newItems = [
    ...(question ? [{role:"user",parts:[{text:question}], ...(img && {img}) }]
  : []),
    {role:"model",parts:[{ text: answer}]},
  ];

  try {

    
    const updatedChat = await Chat.updateOne({_id: req.params.id, userId},{

      $push:{
        history:{
          $each: newItems,
        }
      }


    });

    res.status(200).send(updatedChat);
    
  } catch (err) {
    console.log(err);
    res.status(500).send("Error adding conversation!");
  }

})

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('An error occurred!');
});

// Start the server
app.listen(port, () => {
  connect();
  console.log(`Server Running on port ${port}`);
});
