import React, { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useSession } from '../../contexts/SessionContext';
import { ToastProvider } from '../../contexts/ToastContext';
import { ToastViewport } from '../ui/Toast';
import { DUR, EASE } from '../../lib/motion';

export function AppLayout() {
  const { user, isSuperadmin } = useSession();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  const superadminRoutes = ['/hardware', '/branches'];
  if (!isSuperadmin && superadminRoutes.includes(location.pathname)) {
    return <Navigate to="/" replace />;
  }

  const fullBleed = location.pathname === '/';

  return (
    <ToastProvider>
      <div className="relative flex h-full w-full overflow-hidden bg-canvas">
        <Sidebar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          onToggle={() => setSidebarCollapsed((prev) => !prev)} />
        {mobileNavOpen &&
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-ink/30 md:hidden"
        />}

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar onMenu={() => setMobileNavOpen(true)} />
          <main
            className={
            fullBleed ?
            'min-h-0 flex-1 overflow-hidden' :
            'min-h-0 flex-1 overflow-y-auto scrollbar-none'
            }>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { duration: DUR.base, ease: EASE.out }
                }}
                exit={{
                  opacity: 0,
                  y: -4,
                  transition: { duration: DUR.fast, ease: EASE.in }
                }}
                className={fullBleed ? 'h-full' : ''}>
                {fullBleed ?
                <Outlet /> : (

                /* Uniform page wrapper — every routed page shares this width and padding. */
                <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6">
                    <Outlet />
                  </div>)}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        <ToastViewport />
      </div>
    </ToastProvider>);

}
