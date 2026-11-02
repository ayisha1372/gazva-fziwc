import { Route, Routes } from 'react-router-dom';
import './admin.css';
import { AdminLayout, AdminLogin, Dashboard, MediaLibrary, Messages, RankingsAdmin, RequireAdmin, ResourcePage, Settings, Users } from './pages.jsx';

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="login" element={<AdminLogin />} />
      <Route element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
        <Route index element={<Dashboard />} />
        {['events', 'categories', 'departments', 'wings', 'clubs', 'core', 'advisors', 'testimonials'].map((n) => (
          <Route key={n} path={n} element={<ResourcePage name={n} />} />
        ))}
        <Route path="rankings" element={<RankingsAdmin />} />
        <Route path="media" element={<MediaLibrary />} />
        <Route path="messages" element={<Messages />} />
        <Route path="settings" element={<Settings />} />
        <Route path="users" element={<Users />} />
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  );
}
