import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getStoredAuth, listContacts } from "../api";
import type { Contact } from "../types";

function relativeTime(iso: string | null): string {
  if (!iso) return "No interactions yet";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return "Last interaction today";
  if (days === 1) return "Last interaction yesterday";
  return `Last interaction ${days} days ago`;
}

export default function ContactsList() {
  const navigate = useNavigate();
  const auth = getStoredAuth();
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      navigate("/");
      return;
    }
    listContacts(auth.editToken)
      .then(setContacts)
      .catch((err: Error) => setError(err.message));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!auth) return null;

  return (
    <div className="page">
      <Link to="/editor">← Back to editor</Link>
      <h1>My Contacts</h1>
      {error && <p className="error-text">{error}</p>}
      {contacts === null && !error && <p>Loading…</p>}
      {contacts !== null && contacts.length === 0 && (
        <p className="muted-text">No contacts yet — save a contact from a shared card.</p>
      )}
      {contacts !== null && contacts.length > 0 && (
        <ul className="contact-list">
          {contacts.map((c) => (
            <li key={c.id} className="contact-row">
              <Link to={`/contacts/${c.id}`} className="contact-name">
                {c.subject?.displayName ?? "(unknown)"}
              </Link>
              {c.subject?.headline && (
                <span className="contact-headline">{c.subject.headline}</span>
              )}
              {c.company && (
                <span className="contact-company">
                  <Link to={`/companies/${c.company.id}`}>{c.company.name}</Link>
                  {c.company.enrichmentSource === "derived" && (
                    <span className="inferred-badge" title="Derived from an email domain">
                      inferred
                    </span>
                  )}
                </span>
              )}
              {c.captureContext && (
                <span className="contact-context">{c.captureContext}</span>
              )}
              <span className="contact-last-interaction">
                {relativeTime(c.lastInteractionAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
