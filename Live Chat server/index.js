const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const UserRoutes = require("./Routes/UserRoutes");
const chatRoutes = require("./Routes/chatRoutes"); 
const messageRoutes = require("./Routes/messageRoutes");
const { notFound, errorHandler } = require("./middlewares/errorMiddleware");

dotenv.config();

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Server is Connected to Db");
    } catch (err) {
        console.log("Server is NOT connected to Database:", err.message);
        console.error(err); // Log full error object
    }
};
connectDb();

app.get("/", (req, res) => {
    res.send("API is running");
});
app.use("/user", UserRoutes);
app.use("/chat", chatRoutes);
app.use("/message", messageRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
    console.log(`Server is Running on port ${PORT}...`);
});

const io = require("socket.io")(server, {
    cors: {
        origin: "*",
    },
    pingTimeout: 60000,
});

io.on("connection", (socket) => {
    socket.on("setup", (user) => {
        socket.join(user.data._id);
        socket.emit("connected");
    });

    socket.on("join chat", (room) => {
        socket.join(room);
    });

    socket.on("new message", (newMessageStatus) => {
        const chat = newMessageStatus.chat;
        if (!chat.users) {
            return console.log("chats.users not defined");
        }
        chat.users.forEach((user) => {
            if (user._id === newMessageStatus.sender._id) return;

            socket.in(user._id).emit("message received", newMessageStatus);
        });
    });
});
