import Expense from "../models/Expense.js";

export async function listExpenses(_request, response) {
  const expenses = await Expense.find().sort({ createdAt: -1 });
  response.json(expenses);
}

export async function createExpense(request, response) {
  const expense = await Expense.create(request.body);
  response.status(201).json(expense);
}

export async function updateExpense(request, response) {
  const expense = await Expense.findByIdAndUpdate(request.params.id, request.body, {
    new: true,
    runValidators: true,
  });
  if (!expense) return response.status(404).json({ message: "Expense not found." });
  return response.json(expense);
}

export async function deleteExpense(request, response) {
  const expense = await Expense.findByIdAndDelete(request.params.id);
  if (!expense) return response.status(404).json({ message: "Expense not found." });
  return response.status(204).end();
}
