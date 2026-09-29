import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getOrgTree, getStoredAuth, updateContact } from "../api";
import type { OrgTree, OrgTreeNode } from "../types";
import { t } from "../i18n";

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
          {node.subject?.displayName ?? t("common.unknownPerson")}
        </Link>
        {node.subject?.headline && (
          <span className="contact-headline">{node.subject.headline}</span>
        )}
        <label className="org-manager">
          <span className="muted-text">{t("tree.reportsTo")}</span>
          <select
            value=""
            disabled={busyId === node.contactId}
            onChange={(e) => {
              if (!e.target.value) return;
              onSetManager(node.contactId, e.target.value === NO_MANAGER ? null : e.target.value);
            }}
          >
            <option value="">{t("tree.change")}</option>
            <option value={NO_MANAGER}>{t("tree.nobody")}</option>
            {options.map((o) => (
              <option key={o.contactId} value={o.contactId}>
                {o.subject?.displayName ?? t("common.unknownPerson")}
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
      setError(err instanceof Error ? err.message : t("tree.updateFailed"));
    } finally {
      setBusyId(null);
    }
  }

  if (!auth) return null;
  if (error && !tree) {
    return (
      <div className="page">
        <Link to="/companies">{t("tree.back")}</Link>
        <p className="error-text">{error}</p>
      </div>
    );
  }
  if (!tree) return <div className="page"><p>{t("common.loading")}</p></div>;

  const all = flatten(tree.roots);

  return (
    <div className="page">
      <Link to="/companies">{t("tree.back")}</Link>
      <h1>{tree.company.name}</h1>
      {tree.company.domain && <p className="contact-headline">{tree.company.domain}</p>}
      {tree.company.enrichmentSource === "derived" && (
        <p className="muted-text">
          <span className="inferred-badge">{t("common.inferred")}</span> {t("tree.derived")}
        </p>
      )}

      {error && <p className="error-text">{error}</p>}

      {all.length === 0 ? (
        <p className="muted-text">{t("tree.empty", { company: tree.company.name })}</p>
      ) : (
        <>
          <p className="muted-text">{t("tree.summary", { count: all.length })}</p>
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
