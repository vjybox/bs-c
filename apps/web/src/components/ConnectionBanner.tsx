import { useEffect, useState } from "react";
import { flushQueue, onPendingChange, pendingCount } from "../offline-queue";
import { b, t, tRich } from "../i18n";

/**
 * The visible staleness marker rulebook §5.6 requires, plus the queue depth so a user can
 * see that a capture made offline is safe rather than lost.
 */
export default function ConnectionBanner() {
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    void pendingCount().then(setPending);
    const unsubscribe = onPendingChange(setPending);

    const goOnline = () => {
      setOnline(true);
      void flushQueue().then(() => pendingCount().then(setPending));
    };
    const goOffline = () => setOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      unsubscribe();
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online && pending === 0) return null;

  return (
    <div className={online ? "conn-banner syncing" : "conn-banner offline"} role="status">
      {!online && tRich("connection.offline", { b })}
      {pending > 0 && <span className="conn-pending">{t("connection.pending", { count: pending })}</span>}
    </div>
  );
}
