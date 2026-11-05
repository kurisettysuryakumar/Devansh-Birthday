import mongoose from "mongoose";

const guestSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Guest name is required"], trim: true, maxlength: 80 },
    phone: { type: String, trim: true, maxlength: 25, default: "" },
    email: { type: String, trim: true, lowercase: true, maxlength: 120, default: "" },
    notes: { type: String, trim: true, maxlength: 300, default: "" },
  },
  { timestamps: true },
);

export default mongoose.model("Guest", guestSchema);
