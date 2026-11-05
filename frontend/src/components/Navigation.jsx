import { useState } from "react";

const links = [
  ["home", "Home"],
  ["event", "Event"],
  ["guests", "Guests"],
  ["budget", "Budget"],
  ["rsvp", "RSVP"],
  ["gallery", "Gallery"],
];

export default function Navigation({ activePage, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);

  function navigate(page) {
    onNavigate(page);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <header className="site-header">
      <button className="brand" onClick={() => navigate("home")} aria-label="Go to home">
        <span className="brand-mark">✦</span>
        <span>Devansh<span className="brand-light">’s first</span></span>
      </button>
      <button
        className="menu-toggle"
        onClick={() => setMenuOpen((open) => !open)}
        aria-expanded={menuOpen}
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
      >
        {menuOpen ? "✕" : "☰"}
      </button>
      <nav className={menuOpen ? "nav-links nav-open" : "nav-links"} aria-label="Main navigation">
        {links.map(([page, label]) => (
          <button
            className={activePage === page ? "nav-link active" : "nav-link"}
            key={page}
            onClick={() => navigate(page)}
            aria-current={activePage === page ? "page" : undefined}
          >
            {label}
          </button>
        ))}
        <button className="nav-rsvp" onClick={() => navigate("rsvp")}>Join the party <span>↗</span></button>
      </nav>
    </header>
  );
}
