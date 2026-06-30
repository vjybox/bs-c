import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getStoredAuth, listFieldRequests, respondFieldRequest } from "../api";
import type { FieldRequest } from "../types";

const POLL_INTERVAL_MS = 4000;

export default function Requests() {
  const navigate = useNavigate();
  const auth = getStoredAuth();
  const [requests, setRequests] = useState<FieldRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      navigate("/");
      return;
    }
    let cancelled = false;

    async function load() {
      try {
        const result = await listFieldRequests(auth!.cardId, auth!.editToken);
        if (!cancelled) setRequests(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load requests");
      }
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!auth) return null;

  async function respond(requestId: string, approve: boolean) {
    try {
      const updated = await respondFieldRequest(requestId, auth!.editToken, approve);
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to respond");
    }
  }

  const pending = requests.filter((r) => r.status === "pending");
  const resolved = requests.filter((r) => r.status !== "pending");

  return (
    <div className="page">
      <p>
        <Link to="/editor">← Back to editor</Link>
      </p>
      <h1>Field requests</h1>
      {error ? <p className="error-text">{error}</p> : null}

      <h2>Pending</h2>
      {pending.length === 0 ? <p>No pending requests.</p> : null}
      <ul className="request-list">
        {pending.map((r) => (
          <li key={r.id} className="request-row">
            <span>{r.fieldLabel}</span>
            <button type="button" onClick={() => respond(r.id, true)}>
              Approve
            </button>
            <button type="button" onClick={() => respond(r.id, false)}>
              Deny
            </button>
          </li>
        ))}
      </ul>

      {resolved.length > 0 ? (
        <>
          <h2>Resolved</h2>
          <ul className="request-list">
            {resolved.map((r) => (
              <li key={r.id} className="request-row">
                <span>{r.fieldLabel}</span>
                <span className={`status-badge status-${r.status}`}>{r.status}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
