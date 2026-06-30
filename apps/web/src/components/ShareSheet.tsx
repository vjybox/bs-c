import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { createShareSession } from "../api";

interface ShareSheetProps {
  cardId: string;
  editToken: string;
  onClose: () => void;
}

export default function ShareSheet({ cardId, editToken, onClose }: ShareSheetProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    createShareSession(cardId, editToken, "qr")
      .then((session) => setUrl(session.url))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to create share link"));
  }, [cardId, editToken]);

  async function copyLink() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Share your card</h2>
        {error ? <p className="error-text">{error}</p> : null}
        {url ? (
          <>
            <div className="qr-wrap">
              <QRCodeSVG value={url} size={200} />
            </div>
            <div className="share-link-row">
              <input type="text" readOnly value={url} />
              <button type="button" onClick={copyLink}>
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
          </>
        ) : !error ? (
          <p>Generating link…</p>
        ) : null}
        <button type="button" className="modal-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
