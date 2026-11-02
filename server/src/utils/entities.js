import { ClassUnion, Club, Wing } from '../models/index.js';

/** The three things that can own a ranking login. URL segment -> model + user.entityType. */
export const ENTITIES = {
  wings: { Model: Wing, type: 'wing', prefix: 'wing', label: 'Wing' },
  clubs: { Model: Club, type: 'club', prefix: 'club', label: 'Club' },
  'class-unions': { Model: ClassUnion, type: 'classUnion', prefix: 'cu', label: 'Class union' },
};

export const entityByType = (type) => Object.values(ENTITIES).find((e) => e.type === type);
