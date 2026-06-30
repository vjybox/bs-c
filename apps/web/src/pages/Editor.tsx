import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  addField,
  clearStoredAuth,
  deleteField,
  getOwnerCard,
  getStoredAuth,
  updateField,
} from "../api";
import CardView from "../components/CardView";
import ShareSheet from "../components/ShareSheet";
import type { FieldType, FieldVisibility, OwnerCard, OwnerField, OwnerPerson } from "../types";

const FIELD_TYPES: FieldType[] = ["text", "phone", "email", "url", "social", "custom"];
const VISIBILITIES: FieldVisibility[] = ["public", "link_only", "request_required", "hidden"];

export default function Editor() {
  const navigate = useNavigate();
  const auth = getStoredAuth();

  const [person, setPerson] = useState<OwnerPerson | null>(null);
  const [card, setCard] = useState<OwnerCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newType, setNewType] = useState<FieldType>("text");
  const [newVisibility, setNewVisibility] = useState<FieldVisibility>("public");

  useEffect(() => {
    if (!auth) {
      navigate("/");
      return;
    }
    getOwnerCard(auth.cardId, auth.editToken)
      .then((res) => {
        setPerson(res.person);
        setCard(res.card);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load card"));
  }, []);

  if (!auth) return null;

  function refreshField(updated: OwnerField) {
    setCard((prev) =>
      prev ? { ...prev, fields: prev.fields.map((f) => (f.id === updated.id ? updated : f)) } : prev,
    );
  }

  async function handleVisibilityChange(field: OwnerField, visibility: FieldVisibility) {
    if (!auth) return;
    try {
      const updated = await updateField(auth.cardId, field.id, auth.editToken, { visibility });
      refreshField(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update field");
    }
  }

  async function handleValueChange(field: OwnerField, value: string) {
    if (!auth) return;
    try {
      const updated = await updateField(auth.cardId, field.id, auth.editToken, { value });
      refreshField(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update field");
    }
  }

  async function handleDelete(fieldId: string) {
    if (!auth) return;
    try {
      await deleteField(auth.cardId, fieldId, auth.editToken);
      setCard((prev) => (prev ? { ...prev, fields: prev.fields.filter((f) => f.id !== fieldId) } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete field");
    }
  }

  async function handleAddField() {
    if (!auth || !newLabel.trim()) return;
    try {
      const created = await addField(auth.cardId, auth.editToken, {
        fieldType: newType,
        label: newLabel.trim(),
        value: newValue,
        visibility: newVisibility,
      });
      setCard((prev) => (prev ? { ...prev, fields: [...prev.fields, created] } : prev));
      setNewLabel("");
      setNewValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add field");
    }
  }

  function handleSignOut() {
    clearStoredAuth();
    navigate("/");
  }

  return (
    <div className="page editor-page">
      <div className="editor-toolbar">
        <h1>Edit your card</h1>
        <div className="editor-toolbar-actions">
          <Link to="/editor/requests">Field requests</Link>
          <button type="button" onClick={() => setShowShare(true)} className="primary-btn">
            Share
          </button>
          <button type="button" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <div className="editor-layout">
        <div className="editor-fields">
          {card?.fields.map((field) => (
            <div key={field.id} className="field-row">
              <span className="field-row-label">{field.label}</span>
              <input value={field.value} onChange={(e) => handleValueChange(field, e.target.value)} />
              <select
                value={field.visibility}
                onChange={(e) => handleVisibilityChange(field, e.target.value as FieldVisibility)}
              >
                {VISIBILITIES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => handleDelete(field.id)}>
                Remove
              </button>
            </div>
          ))}

          <h2>Add field</h2>
          <div className="field-row">
            <select value={newType} onChange={(e) => setNewType(e.target.value as FieldType)}>
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input placeholder="Label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
            <input placeholder="Value" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
            <select
              value={newVisibility}
              onChange={(e) => setNewVisibility(e.target.value as FieldVisibility)}
            >
              {VISIBILITIES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <button type="button" onClick={handleAddField}>
              Add
            </button>
          </div>
        </div>

        <div className="editor-preview">
          <h2>Live preview</h2>
          <CardView
            displayName={person?.displayName ?? ""}
            headline={person?.headline}
            fields={
              card?.fields.map((f) => ({
                id: f.id,
                label: f.label,
                value: f.value,
                visibility: f.visibility,
              })) ?? []
            }
          />
        </div>
      </div>

      {showShare && card ? (
        <ShareSheet cardId={card.id} editToken={auth.editToken} onClose={() => setShowShare(false)} />
      ) : null}
    </div>
  );
}
