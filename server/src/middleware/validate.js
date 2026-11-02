/** Parses req.body with a zod schema and replaces it with the cleaned result (unknown keys are dropped). */
export const validateBody = (schema) => (req, _res, next) => {
  try {
    req.body = schema.parse(req.body ?? {});
    next();
  } catch (e) {
    next(e);
  }
};
