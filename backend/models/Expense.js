import mongoose from "mongoose";

export const EXPENSE_CATEGORIES = ["Decoration", "Food", "Outfits", "Makeup", "Photography", "Other"];

const expenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Expense title is required"], trim: true, maxlength: 100 },
    category: { type: String, required: true, enum: EXPENSE_CATEGORIES },
    amount: { type: Number, required: [true, "Expense amount is required"], min: [0.01, "Amount must be greater than zero"] },
    date: { type: Date, default: null },
    notes: { type: String, trim: true, maxlength: 300, default: "" },
  },
  { timestamps: true },
);

export default mongoose.model("Expense", expenseSchema);
