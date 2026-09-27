import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getStoredAuth, listMyCompanies } from "../api";
import type { MyCompany } from "../types";

export default function CompaniesList() {
  const navigate = useNavigate();
  const auth = getStoredAuth();
  const [companies, setCompanies] = useState<MyCompany[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      navigate("/");
      return;
    }
    let ignore = false;
    listMyCompanies(auth.editToken)
      .then((list) => {
        if (!ignore) setCompanies(list);
      })
      .catch((err: Error) => {
        if (!ignore) setError(err.message);
      });
    return () => {
      ignore = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!auth) return null;

  return (
    <div className="page">
      <Link to="/editor">← Back to editor</Link>
      <h1>Companies</h1>
      <p className="muted-text">
        Companies you have captured contacts at. The company record itself is shared across
        everyone; the people you see under it are only ever your own contacts.
      </p>

      {error && <p className="error-text">{error}</p>}
      {companies === null && !error && <p>Loading…</p>}
      {companies !== null && companies.length === 0 && (
        <p className="muted-text">
          No companies yet. Save a contact whose card has a work email and their company appears
          here automatically.
        </p>
      )}

      {companies && companies.length > 0 && (
        <ul className="contact-list">
          {companies.map((c) => (
            <li key={c.id} className="contact-row">
              <Link to={`/companies/${c.id}`} className="contact-name">
                {c.name}
              </Link>
              {c.domain && <span className="contact-headline">{c.domain}</span>}
              <span className="contact-last-interaction">
                {c.contactCount} {c.contactCount === 1 ? "contact" : "contacts"}
                {c.enrichmentSource === "derived" && (
                  <span className="inferred-badge" title="Derived from an email domain — edit to correct">
                    inferred
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
