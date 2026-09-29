import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getDemoPersonas, setStoredAuth, type DemoPersona } from "../api";
import { code, t, tRich } from "../i18n";

type LoadState = "loading" | "ready" | "off" | "error";

export default function Demo() {
  const navigate = useNavigate();
  const [personas, setPersonas] = useState<DemoPersona[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    getDemoPersonas()
      .then((list) => {
        if (ignore) return;
        if (list === null) {
          setState("off");
          return;
        }
        setPersonas(list);
        setState("ready");
      })
      .catch((err: Error) => {
        if (ignore) return;
        setError(err.message);
        setState("error");
      });
    return () => {
      ignore = true;
    };
  }, []);

  function signInAs(p: DemoPersona) {
    setStoredAuth(p.cardId, p.editToken);
    navigate("/editor");
  }

  return (
    <div className="page">
      <Link to="/">{t("demo.back")}</Link>
      <h1>{t("demo.title")}</h1>

      {state === "loading" && <p>{t("common.loading")}</p>}

      {state === "off" && (
        <p className="muted-text">{tRich("demo.off", { code })}</p>
      )}

      {state === "error" && <p className="error-text">{error}</p>}

      {state === "ready" && personas.length === 0 && (
        <p className="muted-text">{tRich("demo.empty", { code })}</p>
      )}

      {state === "ready" && personas.length > 0 && (
        <>
          <p className="muted-text">{t("demo.intro")}</p>
          <ul className="contact-list">
            {personas.map((p) => (
              <li key={p.cardId} className="contact-row">
                <button type="button" className="primary-btn" onClick={() => signInAs(p)}>
                  {t("demo.signInAs", { name: p.displayName })}
                </button>
                {p.headline && <span className="contact-headline">{p.headline}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
