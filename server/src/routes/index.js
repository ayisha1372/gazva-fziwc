import { Router } from 'express';
import * as pub from '../controllers/public.js';
import * as rank from '../controllers/rankings.js';
import * as auth from '../controllers/auth.js';
import * as adm from '../controllers/admin.js';
import { requireAuth, requireAdmin, optionalAuth, requireRankingAccess } from '../middleware/auth.js';
import * as cred from '../controllers/credentials.js';
import { validateBody } from '../middleware/validate.js';
import { loginLimiter, contactLimiter } from '../middleware/security.js';
import { singleImage } from '../middleware/upload.js';
import * as S from '../validators/schemas.js';

const api = Router();

api.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

/* ============ Auth ============ */
api.post('/auth/login', loginLimiter, validateBody(S.loginSchema), auth.login);
api.post('/auth/logout', auth.logout);
api.get('/auth/me', optionalAuth, auth.me);
api.post('/auth/change-password', requireAuth, validateBody(S.changePasswordSchema), auth.changePassword);

/* ============ Public content ============ */
api.get('/settings', pub.getSettings);
api.get('/core', pub.listCore);
api.get('/advisors', pub.listAdvisors);
api.get('/testimonials', pub.listTestimonials);
api.get('/categories', pub.listCategories);
api.get('/departments', pub.listDepartments);
api.get('/departments/:slug', pub.getDepartment);
api.get('/wings', pub.listWings);
api.get('/wings/:slug', pub.getWing);
api.get('/events', pub.listEvents);
api.get('/events/:slug', pub.getEvent);
api.post('/contact', contactLimiter, validateBody(S.contactSchema), pub.submitContact);

/* ============ Rankings ============ */
api.get('/rankings/students', rank.studentRanking); // PUBLIC
// Everything below needs a valid session. This is enforced here on the server, not just in React.
api.get('/rankings/wings', requireRankingAccess('wing'), rank.wingRanking);
api.get('/rankings/clubs', requireRankingAccess('club'), rank.clubRanking);
api.get('/rankings/class-unions', requireRankingAccess('classUnion'), rank.classUnionRanking);

/* ============ Admin (role: admin) ============ */
const admin = Router();
admin.use(requireAdmin);

admin.get('/dashboard', adm.dashboard);

for (const [name, r] of Object.entries(adm.resources)) {
  const base = Router();
  base.get('/', r.list);
  base.get('/:id', r.get);
  base.post('/', validateBody(r.schema), r.create);
  base.put('/:id', validateBody(r.schema), r.update);
  base.delete('/:id', r.remove);
  if (r.points) base.post('/:id/points', validateBody(S.pointsSchema), adm.adjustPoints(r.Model, name));
  admin.use(`/${name}`, base);
}

// One login per wing / club / class union
admin.get('/credentials/:kind', cred.listCredentials);
admin.post('/credentials/:kind/generate', validateBody(S.generateSchema), cred.generateCredentials);
admin.put('/credentials/:kind/:id', validateBody(S.credentialSchema), cred.saveCredential);
admin.delete('/credentials/:kind/:id', cred.removeCredential);

admin.get('/users', adm.listUsers);
admin.post('/users', validateBody(S.userCreateSchema), adm.createUser);
admin.put('/users/:id', validateBody(S.userUpdateSchema), adm.updateUser);
admin.delete('/users/:id', adm.deleteUser);

admin.get('/media', adm.listMedia);
admin.post('/media', singleImage, adm.uploadMedia);
admin.delete('/media/:id', adm.deleteMedia);

admin.get('/messages', adm.listMessages);
admin.patch('/messages/:id', adm.setMessageRead);
admin.delete('/messages/:id', adm.deleteMessage);

admin.get('/settings', adm.getAdminSettings);
admin.put('/settings', validateBody(S.settingsSchema), adm.updateSettings);

api.use('/admin', admin);

export default api;
