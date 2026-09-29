import type { FastifyInstance } from "fastify";
import { query } from "../db.js";
import { requirePersonByToken } from "../auth.js";
import type { CompanyProfileRow } from "../types.js";
import {
  companyIdParamsSchema,
  companySearchQuerySchema,
  createCompanyBodySchema,
  updateCompanyBodySchema,
} from "../schemas.js";
import { normalizeDomain } from "../company-derivation.js";

interface CompanyIdParams {
  companyId: string;
}

interface CompanyBody {
  name?: string;
  domain?: string;
  industry?: string;
  sizeBand?: string;
}

function serializeCompany(row: CompanyProfileRow) {
  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    industry: row.industry,
    sizeBand: row.size_band,
    logoRef: row.logo_ref,
    // Surfaced so the UI can label derived values as inferred (rulebook 9.5).
    enrichmentSource: row.enrichment_source,
    verificationStatus: row.verification_status,
    updatedAt: row.updated_at,
  };
}

interface TreeRow {
  id: string;
  reports_to_contact_id: string | null;
  capture_context: string | null;
  display_name: string | null;
  headline: string | null;
}

interface TreeNode {
  contactId: string;
  subject: { displayName: string; headline: string | null } | null;
  captureContext: string | null;
  reports: TreeNode[];
}

export default async function companiesRoutes(app: FastifyInstance) {
  // Static path first, so "mine" is never captured as a :companyId.
  app.get("/api/companies/mine", async (request, reply) => {
    const person = await requirePersonByToken(request, reply);
    if (!person) return;

    const result = await query<CompanyProfileRow & { contact_count: string }>(
      `SELECT cp.*, count(c.id) AS contact_count
         FROM company_profile cp
         JOIN contact c ON c.company_profile_id = cp.id AND c.owner_person_id = $1
        GROUP BY cp.id
        ORDER BY count(c.id) DESC, cp.name`,
      [person.id],
    );

    return reply.send(
      result.rows.map((row) => ({
        ...serializeCompany(row),
        contactCount: Number(row.contact_count),
      })),
    );
  });

  app.get<{ Querystring: { q?: string } }>(
    "/api/companies",
    { schema: { querystring: companySearchQuerySchema } },
    async (request, reply) => {
      // Firmographic data is global and readable by any authenticated user (rulebook 8.1).
      // Results MUST NOT include or hint at any person.
      const person = await requirePersonByToken(request, reply);
      if (!person) return;

      const q = request.query.q?.trim();
      const result = q
        ? await query<CompanyProfileRow>(
            `SELECT * FROM company_profile
              WHERE name ILIKE $1 OR domain ILIKE $1
              ORDER BY (domain = $2) DESC, name
              LIMIT 20`,
            [`%${q}%`, normalizeDomain(q)],
          )
        : await query<CompanyProfileRow>("SELECT * FROM company_profile ORDER BY name LIMIT 20");

      return reply.send(result.rows.map(serializeCompany));
    },
  );

  app.post<{ Body: CompanyBody }>(
    "/api/companies",
    { schema: { body: createCompanyBodySchema } },
    async (request, reply) => {
      const person = await requirePersonByToken(request, reply);
      if (!person) return;

      const domain = normalizeDomain(request.body.domain);
      if (domain) {
        const existing = await query<CompanyProfileRow>(
          "SELECT * FROM company_profile WHERE domain = $1",
          [domain],
        );
        // The directory is global, so someone else may already have created this company.
        // Returning it is more useful than a conflict the caller can do nothing about.
        if (existing.rows[0]) return reply.code(200).send(serializeCompany(existing.rows[0]));
      }

      const result = await query<CompanyProfileRow>(
        `INSERT INTO company_profile (name, domain, industry, size_band, enrichment_source)
         VALUES ($1, $2, $3, $4, 'manual')
         RETURNING *`,
        [request.body.name, domain, request.body.industry ?? null, request.body.sizeBand ?? null],
      );
      return reply.code(201).send(serializeCompany(result.rows[0]));
    },
  );

  app.get<{ Params: CompanyIdParams }>(
    "/api/companies/:companyId",
    { schema: { params: companyIdParamsSchema } },
    async (request, reply) => {
      const person = await requirePersonByToken(request, reply);
      if (!person) return;

      const result = await query<CompanyProfileRow>(
        "SELECT * FROM company_profile WHERE id = $1",
        [request.params.companyId],
      );
      if (!result.rows[0]) return reply.code(404).send({ error: "Company not found" });
      return reply.send(serializeCompany(result.rows[0]));
    },
  );

  app.patch<{ Params: CompanyIdParams; Body: CompanyBody }>(
    "/api/companies/:companyId",
    { schema: { params: companyIdParamsSchema, body: updateCompanyBodySchema } },
    async (request, reply) => {
      const person = await requirePersonByToken(request, reply);
      if (!person) return;

      // Closed until edits are attributable. company_profile is global, so any signed-in
      // person could rename a company for every tenant, and ADR-0016 forbids the
      // person-identifying column that would record who did it. Corrections need a
      // moderated path before this reopens.
      return reply.code(403).send({ error: "Company details cannot be edited yet" });
    },
  );

  app.get<{ Params: CompanyIdParams }>(
    "/api/companies/:companyId/tree",
    { schema: { params: companyIdParamsSchema } },
    async (request, reply) => {
      const person = await requirePersonByToken(request, reply);
      if (!person) return;

      const companyRes = await query<CompanyProfileRow>(
        "SELECT * FROM company_profile WHERE id = $1",
        [request.params.companyId],
      );
      if (!companyRes.rows[0]) return reply.code(404).send({ error: "Company not found" });

      // Rulebook 9.3: every node is a contact row this caller already owns. Membership is
      // never derived from person/membership rows or another owner's contacts, so "you see
      // only your own contacts" holds by construction rather than by a filter.
      const rows = await query<TreeRow>(
        `SELECT c.id, c.reports_to_contact_id, c.capture_context,
                p.display_name, p.headline
           FROM contact c
           LEFT JOIN person p ON p.id = c.subject_person_id
          WHERE c.owner_person_id = $1 AND c.company_profile_id = $2
          ORDER BY p.display_name NULLS LAST`,
        [person.id, request.params.companyId],
      );

      const nodes = new Map<string, TreeNode>();
      for (const r of rows.rows) {
        nodes.set(r.id, {
          contactId: r.id,
          subject: r.display_name ? { displayName: r.display_name, headline: r.headline } : null,
          captureContext: r.capture_context,
          reports: [],
        });
      }

      const roots: TreeNode[] = [];
      for (const r of rows.rows) {
        const node = nodes.get(r.id)!;
        const parent = r.reports_to_contact_id ? nodes.get(r.reports_to_contact_id) : undefined;
        // A manager outside this set is not reachable here, so the node stands as a root
        // rather than disappearing from the tree.
        if (parent) parent.reports.push(node);
        else roots.push(node);
      }

      // An empty tree is the correct answer for a company you have captured nobody at,
      // not a gap to fill with bought or borrowed data (rulebook 9.4).
      return reply.send({ company: serializeCompany(companyRes.rows[0]), roots });
    },
  );
}
