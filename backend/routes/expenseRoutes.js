import { Router } from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { createExpense, deleteExpense, listExpenses, updateExpense } from "../controllers/expenseController.js";

const router = Router();

router.route("/").get(asyncHandler(listExpenses)).post(asyncHandler(createExpense));
router.route("/:id").put(asyncHandler(updateExpense)).delete(asyncHandler(deleteExpense));

export default router;
