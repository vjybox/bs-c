import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getContact, getStoredAuth, logInteraction } from "../api";
import type { ContactDetail, Interaction, InteractionChannel } from "../types";

const CHANNELS: InteractionChannel[] = ["meeting", "call", "email", "message", "note"];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ContactDetailPage() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const auth = getStoredAuth();

  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [channel, setChannel] = useState<InteractionChannel>("note");
  const [summary, setSummary] = useState("");
  const [logging, setLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth || !contactId) {
      navigate("/");
      return;
    }
    let ignore = false;
    setContact(null);
    setError(null);
    getContact(contactId, auth.editToken)
      .then((data) => {
        if (!ignore) setContact(data);
      })
      .catch((err: Error) => {
        if (!ignore) setError(err.message);
      });
    return () => {
      ignore = true;
    };
  }, [contactId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogInteraction(e: React.FormEvent) {
    e.preventDefault();
    if (!auth || !contact?.connectionId) return;
    setLogging(true);
    setLogError(null);
    try {
      const newInteraction = await logInteraction(
        contact.connectionId,
        auth.editToken,
        channel,
        summary.trim() || undefined,
      );
      const synthetic: Interaction = {
        id: newInteraction.id,
        channel: newInteraction.channel as InteractionChannel,
        summary: newInteraction.summary,
        occurredAt: newInteraction.occurredAt,
        loggedByPersonId: newInteraction.loggedByPersonId,
      };
      setContact((prev) =>
        prev ? { ...prev, interactions: [synthetic, ...prev.interactions] } : prev,
      );
      setSummary("");
    } catch (err) {
      setLogError(err instanceof Error ? err.message : "Failed to log interaction");
    } finally {
      setLogging(false);
    }
  }

  if (!auth) return null;
  if (error) {
    return (
      <div className="page">
        <Link to="/contacts">← My Contacts</Link>
        <p className="error-text">{error}</p>
      </div>
    );
  }
  if (!contact) return <div className="page"><p>Loading…</p></div>;

  return (
    <div className="page">
      <Link to="/contacts">← My Contacts</Link>
      <h1>{contact.subject?.displayName ?? "(unknown)"}</h1>
      {contact.subject?.headline && <p className="contact-headline">{contact.subject.headline}</p>}
      {contact.captureContext && (
        <p className="contact-context">Met: {contact.captureContext}</p>
      )}

      <h2>Log Interaction</h2>
      <form onSubmit={handleLogInteraction}>
        <div>
          <label htmlFor="channel">Channel</label>
          <select
            id="channel"
            value={channel}
            onChange={(e) => setChannel(e.target.value as InteractionChannel)}
          >
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="summary">Notes (optional)</label>
          <textarea
            id="summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            maxLength={2000}
          />
        </div>
        {logError && <p className="error-text">{logError}</p>}
        <button type="submit" disabled={logging}>
          {logging ? "Saving…" : "Log Interaction"}
        </button>
      </form>

      <h2>Interaction History</h2>
      {contact.interactions.length === 0 ? (
        <p className="muted-text">No interactions logged yet.</p>
      ) : (
        <ul className="interaction-list">
          {contact.interactions.map((i) => (
            <li key={i.id} className="interaction-row">
              <span className="interaction-channel">
                {i.channel.charAt(0).toUpperCase() + i.channel.slice(1)}
              </span>
              <span className="interaction-date">{formatDate(i.occurredAt)}</span>
              {i.summary && <p className="interaction-summary">{i.summary}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
