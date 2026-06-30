import type { FieldVisibility } from "../types";

export interface CardViewField {
  id: string;
  label: string;
  value?: string;
  visibility?: FieldVisibility;
  requestable?: boolean;
  requested?: boolean;
}

interface CardViewProps {
  displayName: string;
  headline?: string | null;
  fields: CardViewField[];
  onRequestField?: (fieldId: string) => void;
}

const VISIBILITY_LABEL: Record<FieldVisibility, string> = {
  public: "Public",
  link_only: "Link only",
  request_required: "On request",
  hidden: "Hidden",
};

export default function CardView({ displayName, headline, fields, onRequestField }: CardViewProps) {
  return (
    <div className="card-view">
      <div className="card-view-header">
        <div className="card-view-name">{displayName || "Your name"}</div>
        {headline ? <div className="card-view-headline">{headline}</div> : null}
      </div>
      <ul className="card-view-fields">
        {fields.map((field) => (
          <li key={field.id} className="card-view-field">
            <span className="card-view-field-label">{field.label}</span>
            {field.value !== undefined ? (
              <span className="card-view-field-value">{field.value}</span>
            ) : field.requestable ? (
              <button
                type="button"
                className="card-view-request-btn"
                disabled={field.requested}
                onClick={() => onRequestField?.(field.id)}
              >
                {field.requested ? "Requested" : "Request access"}
              </button>
            ) : null}
            {field.visibility ? (
              <span className={`card-view-visibility-badge badge-${field.visibility}`}>
                {VISIBILITY_LABEL[field.visibility]}
              </span>
            ) : null}
          </li>
        ))}
        {fields.length === 0 ? <li className="card-view-empty">No fields yet.</li> : null}
      </ul>
    </div>
  );
}
