import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getStoredAuth, listContacts } from "../api";
import type { Contact } from "../types";
import { t } from "../i18n";

function relativeTime(iso: string | null): string {
  if (!iso) return t("contacts.noInteractions");
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return t("contacts.lastToday");
  if (days === 1) return t("contacts.lastYesterday");
  return t("contacts.lastDaysAgo", { count: days });
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
      <Link to="/editor">{t("common.backToEditor")}</Link>
      <h1>{t("contacts.title")}</h1>
      {error && <p className="error-text">{error}</p>}
      {contacts === null && !error && <p>{t("common.loading")}</p>}
      {contacts !== null && contacts.length === 0 && (
        <p className="muted-text">{t("contacts.empty")}</p>
      )}
      {contacts !== null && contacts.length > 0 && (
        <ul className="contact-list">
          {contacts.map((c) => (
            <li key={c.id} className="contact-row">
              <Link to={`/contacts/${c.id}`} className="contact-name">
                {c.subject?.displayName ?? t("common.unknownPerson")}
              </Link>
              {c.subject?.headline && (
                <span className="contact-headline">{c.subject.headline}</span>
              )}
              {c.company && (
                <span className="contact-company">
                  <Link to={`/companies/${c.company.id}`}>{c.company.name}</Link>
                  {c.company.enrichmentSource === "derived" && (
                    <span className="inferred-badge" title={t("common.inferredTitle")}>
                      {t("common.inferred")}
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
