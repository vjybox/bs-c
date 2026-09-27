import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { createShareSession } from "../api";
import { buildVCard, publicFieldsOf } from "../vcard";
import type { OwnerCard, OwnerPerson } from "../types";

interface ShareSheetProps {
  cardId: string;
  editToken: string;
  person: OwnerPerson;
  card: OwnerCard;
  onClose: () => void;
}

export default function ShareSheet({ cardId, editToken, person, card, onClose }: ShareSheetProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let ignore = false;
    createShareSession(cardId, editToken, "qr")
      .then((session) => {
        if (!ignore) setUrl(session.url);
      })
      .catch(() => {
        // No session means no network. That is a degraded share, not a failed one.
        if (!ignore) setFailed(true);
      });
    return () => {
      ignore = true;
    };
  }, [cardId, editToken]);

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is refused in some contexts; the link is visible and selectable anyway.
    }
  }

  const publicFields = publicFieldsOf(card.fields);
  const gatedCount = card.fields.length - publicFields.length;
  // Rulebook §6.7 — the offline payload carries public fields and nothing else.
  const vcard = buildVCard({ person, fields: publicFields });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Share your card</h2>

        {url ? (
          <>
            <div className="qr-wrap">
              <QRCodeSVG value={url} size={200} />
            </div>
            <p className="muted-text">
              Full card. Expires automatically, and you can revoke it.
            </p>
            <div className="share-link-row">
              <input type="text" readOnly value={url} />
              <button type="button" onClick={copyLink}>
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
          </>
        ) : failed ? (
          <>
            <div className="qr-wrap">
              <QRCodeSVG value={vcard} size={200} />
            </div>
            <p className="offline-note">
              <strong>Offline — sharing public details only.</strong> This code carries your{" "}
              {publicFields.length} public {publicFields.length === 1 ? "field" : "fields"} directly,
              so it scans with no network on either phone.
              {gatedCount > 0 && (
                <>
                  {" "}
                  Your {gatedCount} other {gatedCount === 1 ? "field is" : "fields are"} not
                  included — those need a link, which needs a connection.
                </>
              )}
            </p>
          </>
        ) : (
          <p>Generating link…</p>
        )}

        <button type="button" className="modal-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
