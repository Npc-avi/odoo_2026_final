import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './features/auth/auth.context';
import { SocketProvider } from './context/socket.context';
import { router } from './app/app.route';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './app/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SocketProvider>
        <RouterProvider router={router} />
        <ToastContainer aria-label="Notifications" position="top-right" theme="dark" autoClose={3000} />
      </SocketProvider>
    </AuthProvider>
  </StrictMode>,
);
