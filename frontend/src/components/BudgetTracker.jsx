import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api.js";

const categories = ["Decoration", "Food", "Outfits", "Makeup", "Photography", "Other"];
const blankExpense = { title: "", category: "Decoration", amount: "", date: "", notes: "" };
const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function BudgetTracker() {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState(blankExpense);
  const [editingId, setEditingId] = useState(null);
  const [budget, setBudget] = useState(() => {
    const saved = Number(window.localStorage.getItem("birthday-budget"));
    return saved > 0 ? saved : 50000;
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;
    apiRequest("/expenses")
      .then((items) => { if (mounted) setExpenses(items); })
      .catch((err) => { if (mounted) setError(err.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const total = useMemo(() => expenses.reduce((sum, item) => sum + item.amount, 0), [expenses]);

  function changeBudget(value) {
    const next = Number(value);
    if (Number.isFinite(next) && next >= 0) {
      setBudget(next);
      window.localStorage.setItem("birthday-budget", String(next));
    }
  }

  async function submitExpense(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    const payload = { ...form, amount: Number(form.amount) };
    try {
      const saved = await apiRequest(editingId ? `/expenses/${editingId}` : "/expenses", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      setExpenses((items) => editingId
        ? items.map((item) => (item._id === editingId ? saved : item))
        : [saved, ...items]);
      setForm(blankExpense);
      setEditingId(null);
      setSuccess(editingId ? "Expense updated." : "Expense added to your plan.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteExpense(id) {
    if (!window.confirm("Delete this expense?")) return;
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/expenses/${id}`, { method: "DELETE" });
      setExpenses((items) => items.filter((item) => item._id !== id));
      setSuccess("Expense deleted.");
    } catch (err) {
      setError(err.message);
    }
  }

  function editExpense(item) {
    setEditingId(item._id);
    setForm({ title: item.title, category: item.category, amount: String(item.amount), date: item.date ? item.date.slice(0, 10) : "", notes: item.notes || "" });
    setSuccess("");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(blankExpense);
  }

  const percentSpent = budget ? Math.min(100, (total / budget) * 100) : total ? 100 : 0;

  return (
    <>
      <div className="budget-summary">
        <article className="summary-card summary-budget"><span>PLANNING BUDGET</span><label className="budget-input-wrap">₹ <input aria-label="Planning budget in rupees" type="number" min="0" value={budget} onChange={(e) => changeBudget(e.target.value)} /></label><small>Tap the amount to edit</small></article>
        <article className="summary-card"><span>PLANNED SO FAR</span><strong>{currency.format(total)}</strong><small>{expenses.length} {expenses.length === 1 ? "expense" : "expenses"} tracked</small></article>
        <article className="summary-card summary-remaining"><span>STILL TO SPEND</span><strong>{currency.format(budget - total)}</strong><small>{total > budget ? "Over your planning budget" : "A little magic left in the budget"}</small></article>
      </div>
      <div className="budget-progress"><div className="progress-label"><span>Budget used</span><strong>{Math.round(percentSpent)}%</strong></div><div className="progress-track"><span style={{ width: `${percentSpent}%` }} /></div></div>
      <div className="management-grid budget-grid">
        <form className="card form-card" onSubmit={submitExpense}>
          <p className="eyebrow">KEEP IT IN CHECK</p><h2>{editingId ? "Edit expense" : "Add an expense"}</h2>
          <label>What’s it for?<input required maxLength="100" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Balloon arch" /></label>
          <label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <div className="field-pair"><label>Amount (₹)<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" /></label><label>Date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label></div>
          <label>Notes <span className="optional">(optional)</span><textarea rows="2" maxLength="300" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anything to remember?" /></label>
          {error && <p className="alert error" role="alert">{error}</p>}{success && <p className="alert success" role="status">{success}</p>}
          <div className="form-actions"><button className="button button-primary" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Add expense"} <span>→</span></button>{editingId && <button type="button" className="button button-quiet" onClick={cancelEdit}>Cancel</button>}</div>
        </form>
        <div className="card list-card">
          <p className="eyebrow">THE LITTLE DETAILS</p><h2>Expense list <span className="count-badge">{expenses.length}</span></h2>
          {loading ? <p className="empty-state">Loading expenses…</p>
            : error && !expenses.length ? <p className="empty-state">Couldn’t load expenses. Check that the API and MongoDB are running.</p>
              : expenses.length === 0 ? <p className="empty-state">No expenses yet. Add the first little detail of the big day.</p>
                : <div className="expense-list">{expenses.map((item) => <article className="expense-row" key={item._id}>
                  <div className={`category-dot category-${categories.indexOf(item.category)}`}>{["✿", "♨", "♧", "✦", "◎", "＋"][categories.indexOf(item.category)]}</div>
                  <div className="expense-info"><strong>{item.title}</strong><span>{item.category}{item.date ? ` · ${new Date(`${item.date.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}</span></div>
                  <strong className="expense-amount">{currency.format(item.amount)}</strong>
                  <div className="row-actions"><button className="icon-button" onClick={() => editExpense(item)} aria-label={`Edit ${item.title}`}>✎</button><button className="icon-button delete-button" onClick={() => deleteExpense(item._id)} aria-label={`Delete ${item.title}`}>×</button></div>
                </article>)}</div>}
        </div>
      </div>
    </>
  );
}
