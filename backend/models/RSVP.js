import mongoose from "mongoose";

const rsvpSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Guest name is required"], trim: true, maxlength: 80 },
    phone: { type: String, required: [true, "Phone number is required"], trim: true, maxlength: 25 },
    guests: { type: Number, required: true, min: [1, "At least one person is required"], max: [12, "Party size cannot exceed 12"], validate: Number.isInteger },
    attending: { type: String, required: true, enum: ["yes", "no"] },
    notes: { type: String, trim: true, maxlength: 300, default: "" },
  },
  { timestamps: true },
);

export default mongoose.model("RSVP", rsvpSchema);
