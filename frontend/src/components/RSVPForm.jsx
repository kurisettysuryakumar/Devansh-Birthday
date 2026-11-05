import { useEffect, useState } from "react";
import { apiRequest } from "../api.js";

const initialForm = { name: "", phone: "", guests: "1", attending: "yes", notes: "" };

export default function RSVPForm() {
  const [form, setForm] = useState(initialForm);
  const [rsvps, setRsvps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;
    apiRequest("/rsvp")
      .then((items) => { if (mounted) setRsvps(items); })
      .catch((err) => { if (mounted) setError(err.message); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const saved = await apiRequest("/rsvp", {
        method: "POST",
        body: JSON.stringify({ ...form, guests: Number(form.guests) }),
      });
      setRsvps((items) => [saved, ...items]);
      setSuccess(`Thank you, ${saved.name}! Your RSVP has been saved.`);
      setForm(initialForm);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const attendingCount = rsvps.filter((item) => item.attending === "yes").reduce((sum, item) => sum + item.guests, 0);

  return (
    <div className="rsvp-layout">
      <div className="rsvp-copy">
        <p className="eyebrow">SAVE YOUR SPOT</p>
        <h2>We’d love to<br /><em>celebrate with you.</em></h2>
        <p>Let us know if you can make it to Devansh’s big day. Little ones count too!</p>
        <div className="rsvp-count"><span>♡</span><div><strong>{loading ? "…" : attendingCount}</strong><small>party people said yes</small></div></div>
        {!loading && error && <p className="alert error" role="alert">{error}</p>}
      </div>
      <form className="card rsvp-card" onSubmit={submit}>
        <h3>Send your RSVP</h3><p className="form-intro">A little note for the party planner.</p>
        <label>Your name<input required maxLength="80" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="First and last name" /></label>
        <label>Phone number<input required type="tel" maxLength="25" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" /></label>
        <div className="field-pair"><label>Party size<select value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} {index === 0 ? "person" : "people"}</option>)}</select></label><label>Can you make it?<select value={form.attending} onChange={(e) => setForm({ ...form, attending: e.target.value })}><option value="yes">Joyfully, yes!</option><option value="no">Sorry, can’t make it</option></select></label></div>
        <label>A little note <span className="optional">(optional)</span><textarea maxLength="300" rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Dietary needs or a message for Devansh…" /></label>
        {error && <p className="alert error" role="alert">{error}</p>}{success && <p className="alert success" role="status">{success}</p>}
        <button className="button button-primary button-wide" disabled={submitting}>{submitting ? "Sending…" : "Send my RSVP"} <span>→</span></button>
      </form>
    </div>
  );
}
