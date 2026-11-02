import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import OrgExplorer from './components/org/OrgExplorer.jsx';
import Home from './pages/Home.jsx';
import Core from './pages/Core.jsx';
import Events from './pages/Events.jsx';
import EventDetail from './pages/EventDetail.jsx';
import Rankings from './pages/Rankings.jsx';
import Contact from './pages/Contact.jsx';
import NotFound from './pages/NotFound.jsx';
import { Loading } from './components/ui/index.jsx';

// The admin panel is its own chunk: visitors to the public site never download it.
const Admin = lazy(() => import('./admin/AdminRoutes.jsx'));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="core" element={<Core />} />
        <Route path="wings" element={<OrgExplorer kind="wing" />} />
        <Route path="wings/:slug" element={<OrgExplorer kind="wing" />} />
        <Route path="departments" element={<OrgExplorer kind="department" />} />
        <Route path="departments/:slug" element={<OrgExplorer kind="department" />} />
        <Route path="events" element={<Events />} />
        <Route path="events/:slug" element={<EventDetail />} />
        <Route path="rankings" element={<Rankings />} />
        <Route path="rankings/:tab" element={<Rankings />} />
        <Route path="contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="admin/*" element={<Suspense fallback={<Loading label="Loading admin…" />}><Admin /></Suspense>} />
    </Routes>
  );
}
