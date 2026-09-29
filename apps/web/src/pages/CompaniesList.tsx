import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getStoredAuth, listMyCompanies } from "../api";
import type { MyCompany } from "../types";
import { t } from "../i18n";

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
      <Link to="/editor">{t("common.backToEditor")}</Link>
      <h1>{t("companies.title")}</h1>
      <p className="muted-text">{t("companies.intro")}</p>

      {error && <p className="error-text">{error}</p>}
      {companies === null && !error && <p>{t("common.loading")}</p>}
      {companies !== null && companies.length === 0 && (
        <p className="muted-text">{t("companies.empty")}</p>
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
                {t("companies.contactCount", { count: c.contactCount })}
                {c.enrichmentSource === "derived" && (
                  <span className="inferred-badge" title={t("common.inferredTitle")}>
                    {t("common.inferred")}
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
