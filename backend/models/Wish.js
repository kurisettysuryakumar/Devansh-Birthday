import mongoose from "mongoose";

const wishSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Your name is required"], trim: true, maxlength: 80 },
    message: { type: String, required: [true, "Your birthday message is required"], trim: true, maxlength: 400 },
  },
  { timestamps: true },
);

export default mongoose.model("Wish", wishSchema);
