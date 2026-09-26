import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getShareSession, getStoredAuth, requestField, saveContact } from "../api";
import CardView from "../components/CardView";
import type { RecipientCardView } from "../types";

const POLL_INTERVAL_MS = 3000;

export default function RecipientView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [view, setView] = useState<RecipientCardView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const auth = getStoredAuth();

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    async function load() {
      try {
        const result = await getShareSession(sessionId!);
        if (!cancelled) {
          setView(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load card");
      }
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sessionId]);

  async function handleRequest(fieldId: string) {
    if (!sessionId) return;
    setRequestedIds((prev) => new Set(prev).add(fieldId));
    try {
      await requestField(sessionId, fieldId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request field");
    }
  }

  async function handleSaveContact() {
    if (!sessionId || !auth) return;
    setSaveState("saving");
    setSaveError(null);
    try {
      await saveContact(sessionId, auth.editToken);
      setSaveState("saved");
    } catch (err) {
      setSaveState("error");
      setSaveError(err instanceof Error ? err.message : "Failed to save contact");
    }
  }

  if (error) {
    return (
      <div className="page">
        <p className="error-text">{error}</p>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="page">
        <p>Loading…</p>
      </div>
    );
  }

  const fields = [
    ...view.fields.map((f) => ({ id: f.id, label: f.label, value: f.value })),
    ...view.requestableFields.map((f) => ({
      id: f.id,
      label: f.label,
      requestable: true,
      requested: requestedIds.has(f.id),
    })),
  ];

  return (
    <div className="page">
      <CardView
        displayName={view.person.displayName}
        headline={view.person.headline}
        fields={fields}
        onRequestField={handleRequest}
      />
      {auth && (
        <div style={{ marginTop: "1rem" }}>
          {saveState === "saved" ? (
            <p>Contact saved ✓</p>
          ) : (
            <button
              onClick={handleSaveContact}
              disabled={saveState === "saving"}
            >
              {saveState === "saving" ? "Saving…" : "Save Contact"}
            </button>
          )}
          {saveState === "error" && saveError && (
            <p className="error-text">{saveError}</p>
          )}
        </div>
      )}
    </div>
  );
}
