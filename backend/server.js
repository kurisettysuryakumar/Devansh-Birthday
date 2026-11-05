import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import expenseRoutes from "./routes/expenseRoutes.js";
import guestRoutes from "./routes/guestRoutes.js";
import rsvpRoutes from "./routes/rsvpRoutes.js";
import wishRoutes from "./routes/wishRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 5000;
const mongoUri = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json({ limit: "20kb" }));
app.get("/api/health", (_request, response) => {
  const connected = mongoose.connection.readyState === 1;
  response.status(connected ? 200 : 503).json({
    status: connected ? "ok" : "unavailable",
    database: connected ? "connected" : "disconnected",
  });
});
app.use("/api/guests", guestRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/rsvp", rsvpRoutes);
app.use("/api/wishes", wishRoutes);
app.use(notFound);
app.use(errorHandler);

if (!mongoUri) {
  console.error("MONGODB_URI is required. Copy .env.example to backend/.env and configure MongoDB.");
  process.exitCode = 1;
} else {
  try {
    await mongoose.connect(mongoUri);
    app.listen(port, () => {
      console.log(`Birthday Event Planner API listening on port ${port}`);
    });
  } catch (error) {
    console.error("Could not connect to MongoDB:", error.message);
    process.exitCode = 1;
  }
}

mongoose.connection.on("error", (error) => {
  console.error("MongoDB connection error:", error.message);
});
