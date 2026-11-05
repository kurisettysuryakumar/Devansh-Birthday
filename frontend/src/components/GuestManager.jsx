import { useEffect, useState } from "react";
import { apiRequest } from "../api.js";

const emptyForm = { name: "", phone: "", email: "", notes: "" };

export default function GuestManager() {
  const [guests, setGuests] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadGuests() {
    setLoading(true);
    setError("");
    try {
      setGuests(await apiRequest("/guests"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadGuests(); }, []);

  async function submitGuest(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const saved = await apiRequest(editingId ? `/guests/${editingId}` : "/guests", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
      setGuests((current) => editingId
        ? current.map((guest) => (guest._id === editingId ? saved : guest))
        : [saved, ...current]);
      setForm(emptyForm);
      setEditingId(null);
      setSuccess(editingId ? "Guest details updated." : "Guest added to the list!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function editGuest(guest) {
    setForm({ name: guest.name, phone: guest.phone || "", email: guest.email || "", notes: guest.notes || "" });
    setEditingId(guest._id);
    setSuccess("");
  }

  async function deleteGuest(id) {
    if (!window.confirm("Remove this guest from the list?")) return;
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/guests/${id}`, { method: "DELETE" });
      setGuests((current) => current.filter((guest) => guest._id !== id));
      if (editingId === id) cancelEdit();
      setSuccess("Guest removed.");
    } catch (err) {
      setError(err.message);
    }
  }

  function cancelEdit() {
    setForm(emptyForm);
    setEditingId(null);
  }

  const filteredGuests = guests.filter((guest) => (
    `${guest.name} ${guest.email || ""} ${guest.phone || ""}`.toLowerCase().includes(search.toLowerCase())
  ));

  return (
    <div className="management-grid">
      <form className="card form-card" onSubmit={submitGuest}>
        <p className="eyebrow">YOUR PEOPLE</p>
        <h2>{editingId ? "Update guest" : "Add a guest"}</h2>
        <label>Guest name<input required maxLength="80" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Priya Sharma" /></label>
        <label>Phone number<input type="tel" maxLength="25" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" /></label>
        <label>Email address<input type="email" maxLength="120" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="hello@example.com" /></label>
        <label>Notes <span className="optional">(optional)</span><textarea maxLength="300" rows="3" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Dietary notes, little ones..." /></label>
        {error && <p className="alert error" role="alert">{error}</p>}
        {success && <p className="alert success" role="status">{success}</p>}
        <div className="form-actions">
          <button className="button button-primary" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Add to guest list"} <span>→</span></button>
          {editingId && <button type="button" className="button button-quiet" onClick={cancelEdit}>Cancel</button>}
        </div>
      </form>
      <div className="card list-card">
        <div className="list-heading"><div><p className="eyebrow">THE PARTY CREW</p><h2>Guest list <span className="count-badge">{guests.length}</span></h2></div></div>
        <input className="search-input" type="search" aria-label="Search guests" placeholder="⌕  Search name, email or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {loading ? <p className="empty-state">Getting the guest list…</p>
          : error && !guests.length ? <p className="empty-state">Couldn’t load guests. Check that the API and MongoDB are running.</p>
            : filteredGuests.length === 0 ? <p className="empty-state">{guests.length ? "No guests match that search." : "Your guest list is ready for its first name."}</p>
              : <div className="guest-list">{filteredGuests.map((guest, index) => (
                <article className="guest-row" key={guest._id}>
                  <div className={`avatar avatar-${index % 5}`}>{guest.name.trim().charAt(0).toUpperCase()}</div>
                  <div className="guest-info"><strong>{guest.name}</strong><span>{guest.phone || guest.email || "No contact details"}</span></div>
                  <div className="row-actions">
                    <button className="icon-button" onClick={() => editGuest(guest)} aria-label={`Edit ${guest.name}`}>✎</button>
                    <button className="icon-button delete-button" onClick={() => deleteGuest(guest._id)} aria-label={`Delete ${guest.name}`}>×</button>
                  </div>
                </article>
              ))}</div>}
      </div>
    </div>
  );
}
