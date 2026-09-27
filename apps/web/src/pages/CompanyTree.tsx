import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getOrgTree, getStoredAuth, updateContact } from "../api";
import type { OrgTree, OrgTreeNode } from "../types";

/** Distinct from "" so choosing it actually fires a change off the placeholder option. */
const NO_MANAGER = "__none__";

/** Flattens the tree so the manager picker can offer every other node at this company. */
function flatten(nodes: OrgTreeNode[], out: OrgTreeNode[] = []): OrgTreeNode[] {
  for (const n of nodes) {
    out.push(n);
    flatten(n.reports, out);
  }
  return out;
}

/** Descendants may not become a node's manager — that would close a loop. */
function descendantIds(node: OrgTreeNode): Set<string> {
  const ids = new Set<string>();
  const walk = (n: OrgTreeNode) => {
    for (const child of n.reports) {
      ids.add(child.contactId);
      walk(child);
    }
  };
  walk(node);
  return ids;
}

function TreeBranch({
  node,
  all,
  onSetManager,
  busyId,
}: {
  node: OrgTreeNode;
  all: OrgTreeNode[];
  onSetManager: (contactId: string, managerId: string | null) => void;
  busyId: string | null;
}) {
  const blocked = descendantIds(node);
  const options = all.filter((c) => c.contactId !== node.contactId && !blocked.has(c.contactId));

  return (
    <li className="org-node">
      <div className="org-node-body">
        <Link to={`/contacts/${node.contactId}`} className="contact-name">
          {node.subject?.displayName ?? "(unknown)"}
        </Link>
        {node.subject?.headline && (
          <span className="contact-headline">{node.subject.headline}</span>
        )}
        <label className="org-manager">
          <span className="muted-text">Reports to</span>
          <select
            value=""
            disabled={busyId === node.contactId}
            onChange={(e) => {
              if (!e.target.value) return;
              onSetManager(node.contactId, e.target.value === NO_MANAGER ? null : e.target.value);
            }}
          >
            <option value="">— change —</option>
            <option value={NO_MANAGER}>Nobody (top level)</option>
            {options.map((o) => (
              <option key={o.contactId} value={o.contactId}>
                {o.subject?.displayName ?? "(unknown)"}
              </option>
            ))}
          </select>
        </label>
      </div>
      {node.reports.length > 0 && (
        <ul className="org-branch">
          {node.reports.map((child) => (
            <TreeBranch
              key={child.contactId}
              node={child}
              all={all}
              onSetManager={onSetManager}
              busyId={busyId}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function CompanyTree() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const auth = getStoredAuth();

  const [tree, setTree] = useState<OrgTree | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!auth || !companyId) return;
    const data = await getOrgTree(companyId, auth.editToken);
    setTree(data);
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!auth || !companyId) {
      navigate("/");
      return;
    }
    let ignore = false;
    setTree(null);
    setError(null);
    getOrgTree(companyId, auth.editToken)
      .then((data) => {
        if (!ignore) setTree(data);
      })
      .catch((err: Error) => {
        if (!ignore) setError(err.message);
      });
    return () => {
      ignore = true;
    };
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSetManager(contactId: string, managerId: string | null) {
    if (!auth) return;
    setBusyId(contactId);
    setError(null);
    try {
      await updateContact(contactId, auth.editToken, { reportsToContactId: managerId });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the reporting line");
    } finally {
      setBusyId(null);
    }
  }

  if (!auth) return null;
  if (error && !tree) {
    return (
      <div className="page">
        <Link to="/companies">← Companies</Link>
        <p className="error-text">{error}</p>
      </div>
    );
  }
  if (!tree) return <div className="page"><p>Loading…</p></div>;

  const all = flatten(tree.roots);

  return (
    <div className="page">
      <Link to="/companies">← Companies</Link>
      <h1>{tree.company.name}</h1>
      {tree.company.domain && <p className="contact-headline">{tree.company.domain}</p>}
      {tree.company.enrichmentSource === "derived" && (
        <p className="muted-text">
          <span className="inferred-badge">inferred</span> This company was derived from an email
          domain rather than entered by hand.
        </p>
      )}

      {error && <p className="error-text">{error}</p>}

      {all.length === 0 ? (
        <p className="muted-text">
          You have not captured anyone at {tree.company.name}. That is the whole answer — this
          tree only ever shows your own contacts, so it stays empty rather than being filled in
          with other people's.
        </p>
      ) : (
        <>
          <p className="muted-text">
            {all.length} of your contacts. Reporting lines are private to you.
          </p>
          <ul className="org-tree">
            {tree.roots.map((node) => (
              <TreeBranch
                key={node.contactId}
                node={node}
                all={all}
                onSetManager={handleSetManager}
                busyId={busyId}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
