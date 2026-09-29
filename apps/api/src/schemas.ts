const uuidPattern = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";

const uuidSchema = { type: "string", pattern: uuidPattern };

const fieldTypeSchema = { type: "string", enum: ["text", "phone", "email", "url", "social", "custom"] };
const fieldVisibilitySchema = {
  type: "string",
  enum: ["public", "link_only", "request_required", "hidden"],
};
const shareChannelSchema = { type: "string", enum: ["link", "qr"] };

const newFieldSchema = {
  type: "object",
  required: ["fieldType", "label", "value", "visibility"],
  additionalProperties: false,
  properties: {
    fieldType: fieldTypeSchema,
    label: { type: "string", minLength: 1, maxLength: 200 },
    value: { type: "string", maxLength: 2000 },
    visibility: fieldVisibilitySchema,
  },
};

export const createCardBodySchema = {
  type: "object",
  required: ["displayName"],
  additionalProperties: false,
  properties: {
    displayName: { type: "string", minLength: 1, maxLength: 200 },
    headline: { type: "string", maxLength: 300 },
    fields: { type: "array", items: newFieldSchema, maxItems: 50 },
  },
};

export const cardIdParamsSchema = {
  type: "object",
  required: ["cardId"],
  properties: { cardId: uuidSchema },
};

export const cardFieldParamsSchema = {
  type: "object",
  required: ["cardId", "fieldId"],
  properties: { cardId: uuidSchema, fieldId: uuidSchema },
};

export const createFieldBodySchema = newFieldSchema;

export const updateFieldBodySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    label: { type: "string", minLength: 1, maxLength: 200 },
    value: { type: "string", maxLength: 2000 },
    visibility: fieldVisibilitySchema,
    displayOrder: { type: "integer", minimum: 0 },
  },
};

export const createShareSessionBodySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    channel: shareChannelSchema,
  },
};

export const sessionIdParamsSchema = {
  type: "object",
  required: ["sessionId"],
  properties: { sessionId: uuidSchema },
};

export const createFieldRequestBodySchema = {
  type: "object",
  required: ["fieldId"],
  additionalProperties: false,
  properties: { fieldId: uuidSchema },
};

export const fieldRequestIdParamsSchema = {
  type: "object",
  required: ["id"],
  properties: { id: uuidSchema },
};

export const respondBodySchema = {
  type: "object",
  required: ["approve"],
  additionalProperties: false,
  properties: { approve: { type: "boolean" } },
};

export const contactIdParamsSchema = {
  type: "object",
  required: ["contactId"],
  properties: { contactId: uuidSchema },
};

export const createContactBodySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    // Client-generated so an offline capture replayed twice still creates one contact.
    id: uuidSchema,
    shareSessionId: uuidSchema,
    subjectPersonId: uuidSchema,
    captureSource: { type: "string", enum: ["card_share", "manual"] },
    captureContext: { type: "string", maxLength: 500 },
  },
};

export const logInteractionBodySchema = {
  type: "object",
  required: ["channel"],
  additionalProperties: false,
  properties: {
    // Client-generated idempotency key; see POST /api/contacts/:contactId/interactions.
    id: uuidSchema,
    channel: { type: "string", enum: ["meeting", "call", "email", "message", "note"] },
    summary: { type: "string", maxLength: 2000 },
    occurredAt: { type: "string", format: "date-time" },
  },
};

export const companyIdParamsSchema = {
  type: "object",
  required: ["companyId"],
  properties: { companyId: uuidSchema },
};

const sizeBandSchema = { type: "string", enum: ["1-10", "11-50", "51-200", "201-1000", "1000+"] };

export const createCompanyBodySchema = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1, maxLength: 200 },
    domain: { type: "string", maxLength: 253 },
    industry: { type: "string", maxLength: 100 },
    sizeBand: sizeBandSchema,
  },
};

export const updateCompanyBodySchema = {
  type: "object",
  additionalProperties: false,
  minProperties: 1,
  properties: {
    name: { type: "string", minLength: 1, maxLength: 200 },
    domain: { type: "string", maxLength: 253 },
    industry: { type: "string", maxLength: 100 },
    sizeBand: sizeBandSchema,
  },
};

export const companySearchQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: { q: { type: "string", maxLength: 200 } },
};

/** Both fields are nullable so the UI can clear a company or a reporting line. */
export const patchContactBodySchema = {
  type: "object",
  additionalProperties: false,
  minProperties: 1,
  properties: {
    companyProfileId: { type: ["string", "null"], format: "uuid" },
    reportsToContactId: { type: ["string", "null"], format: "uuid" },
  },
};
