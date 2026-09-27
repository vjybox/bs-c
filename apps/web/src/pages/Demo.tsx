import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getDemoPersonas, setStoredAuth, type DemoPersona } from "../api";

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
      <Link to="/">← Create your own card</Link>
      <h1>Demo sign-in</h1>

      {state === "loading" && <p>Loading…</p>}

      {state === "off" && (
        <p className="muted-text">
          Demo mode is off. Start the stack with <code>docker compose up --build</code>, which sets{" "}
          <code>DEMO_MODE=true</code> and seeds sample data automatically.
        </p>
      )}

      {state === "error" && <p className="error-text">{error}</p>}

      {state === "ready" && personas.length === 0 && (
        <p className="muted-text">
          No seeded people yet — run <code>npm run seed --workspace=apps/api</code>.
        </p>
      )}

      {state === "ready" && personas.length > 0 && (
        <>
          <p className="muted-text">
            Pick someone to sign in as. Mara has the most data — four contacts, a pending field
            request, and a relationship that has gone quiet.
          </p>
          <ul className="contact-list">
            {personas.map((p) => (
              <li key={p.cardId} className="contact-row">
                <button type="button" className="primary-btn" onClick={() => signInAs(p)}>
                  Sign in as {p.displayName}
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
