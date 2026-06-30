import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createCard, setStoredAuth, type NewFieldInput } from "../api";
import type { FieldType, FieldVisibility } from "../types";

const FIELD_TYPES: FieldType[] = ["text", "phone", "email", "url", "social", "custom"];
const VISIBILITIES: FieldVisibility[] = ["public", "link_only", "request_required", "hidden"];

function emptyField(): NewFieldInput {
  return { fieldType: "text", label: "", value: "", visibility: "public" };
}

export default function CreateCard() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [fields, setFields] = useState<NewFieldInput[]>([
    { fieldType: "email", label: "Email", value: "", visibility: "public" },
    { fieldType: "phone", label: "Phone", value: "", visibility: "request_required" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(index: number, patch: Partial<NewFieldInput>) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Name is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await createCard(
        displayName,
        headline,
        fields.filter((f) => f.label.trim().length > 0),
      );
      setStoredAuth(result.card.id, result.editToken);
      navigate("/editor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create card");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1>Create your digital card</h1>
      <form onSubmit={handleSubmit} className="form">
        <label>
          Name
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <label>
          Headline
          <input value={headline} onChange={(e) => setHeadline(e.target.value)} />
        </label>

        <h2>Fields</h2>
        {fields.map((field, index) => (
          <div key={index} className="field-row">
            <select
              value={field.fieldType}
              onChange={(e) => updateField(index, { fieldType: e.target.value as FieldType })}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              placeholder="Label"
              value={field.label}
              onChange={(e) => updateField(index, { label: e.target.value })}
            />
            <input
              placeholder="Value"
              value={field.value}
              onChange={(e) => updateField(index, { value: e.target.value })}
            />
            <select
              value={field.visibility}
              onChange={(e) => updateField(index, { visibility: e.target.value as FieldVisibility })}
            >
              {VISIBILITIES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => removeField(index)}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setFields((prev) => [...prev, emptyField()])}>
          + Add field
        </button>

        {error ? <p className="error-text">{error}</p> : null}
        <button type="submit" disabled={submitting} className="primary-btn">
          {submitting ? "Creating…" : "Create card"}
        </button>
      </form>
    </div>
  );
}
