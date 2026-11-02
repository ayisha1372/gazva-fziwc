export function slugify(input = '') {
  return String(input)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’"`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Mongoose plugin: keeps a unique, URL-safe `slug` derived from `source`.
 * `scope` lets uniqueness be per-group (e.g. categories are unique per `type`).
 */
export function slugPlugin(schema, { source = 'name', scope = [] } = {}) {
  schema.add({ slug: { type: String, trim: true, lowercase: true } });

  schema.pre('validate', async function ensureSlug(next) {
    try {
      // Slugs are generated once and then stay stable, so shared links never break when something is renamed.
      const needs = !this.slug;
      if (!needs) return next();
      const base = slugify(this[source]) || 'item';
      let candidate = base;
      let n = 1;
      // eslint-disable-next-line no-await-in-loop
      while (true) {
        const q = { slug: candidate, _id: { $ne: this._id } };
        scope.forEach((k) => { q[k] = this[k]; });
        // eslint-disable-next-line no-await-in-loop
        const clash = await this.constructor.exists(q);
        if (!clash) break;
        n += 1;
        candidate = `${base}-${n}`;
      }
      this.slug = candidate;
      next();
    } catch (e) {
      next(e);
    }
  });
}
