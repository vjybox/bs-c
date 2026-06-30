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
