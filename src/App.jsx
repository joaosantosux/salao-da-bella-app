import './App.css';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { auth, db } from './firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import AdminRoute from './components/AdminRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import AdminLayout from './layouts/AdminLayout';
import ClientLayout from './layouts/ClientLayout'; // Importa o layout do cliente

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import HomePage from './pages/HomePage';
import MyBookingsPage from './pages/MyBookingsPage';
import BookingPage from './pages/BookingPage';
import AdminDashboard from './pages/AdminDashboard';
import ServiceManagement from './pages/ServiceManagement';
import AvailabilityManagement from './pages/AvailabilityManagement';
import ManualBookingPage from './pages/ManualBookingPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import KanbanPage from './pages/KanbanPage';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          setCurrentUser(userDoc.exists() ? { ...user, name: userDoc.data().name, role: userDoc.data().role } : user);
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error("Erro ao buscar dados do usuário:", error);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    toast((t) => (
      <div className="confirmation-toast">
        <h4>Olá, {currentUser?.name || 'usuário'}!</h4>
        <p>Você realmente deseja sair?</p>
        <div className="toast-buttons">
          <button className="confirm-button-toast" onClick={async () => { toast.dismiss(t.id); await signOut(auth); toast.success('Você saiu com sucesso!'); }}>Sim, sair</button>
          <button className="cancel-button-toast" onClick={() => toast.dismiss(t.id)}>Não</button>
        </div>
      </div>
    ), { duration: 6000 });
  };

  if (loading) { return <div>Carregando...</div>; }

  return (
    <Router>
      <div>
        <Toaster position="top-center" reverseOrder={false} toastOptions={{ duration: 3000, style: { background: '#363636', color: '#fff' }, success: { duration: 3000 }, error: { duration: 4000 } }} />
        <header className="header">
          <h1><Link to="/" className="main-title-link">Salão da Bella</Link></h1>

          {/* AQUI ESTÁ A MUDANÇA: O <nav> agora só mostra informações do usuário */}
          {currentUser && (
            <nav>
              {/* Os links de cliente foram removidos daqui */}

              <span className="user-email">{currentUser.name ? `Olá, ${currentUser.name}` : currentUser.email}</span>
              <button onClick={handleLogout} className="logout-button">Sair</button>
            </nav>
          )}
        </header>
        <main>
          <Routes>
            {/* A lógica de rotas está correta e permanece a mesma */}
            <Route path="/" element={!currentUser ? <Navigate to="/login" /> : (currentUser.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/servicos" />)} />
            <Route path="/login" element={<PublicOnlyRoute currentUser={currentUser}><LoginPage /></PublicOnlyRoute>} />
            <Route path="/signup" element={<PublicOnlyRoute currentUser={currentUser}><SignupPage /></PublicOnlyRoute>} />
            <Route path="/recuperar-senha" element={<PublicOnlyRoute currentUser={currentUser}><ForgotPasswordPage /></PublicOnlyRoute>} />

            {/* Rotas de Cliente Aninhadas usam o ClientLayout */}
            <Route path="/servicos" element={<ClientLayout />}>
              <Route index element={<HomePage />} />
            </Route>
            <Route path="/meus-agendamentos" element={<ClientLayout />}>
              <Route index element={<MyBookingsPage currentUser={currentUser} />} />
            </Route>

            <Route path="/agendar/:serviceId" element={<BookingPage currentUser={currentUser} />} />

            {/* Rotas de Admin Aninhadas usam o AdminLayout */}
            <Route path="/admin" element={<AdminRoute currentUser={currentUser}><AdminLayout /></AdminRoute>}>
              <Route path="kanban" element={<KanbanPage />} />
              <Route index element={<AdminDashboard />} />
              <Route path="services" element={<ServiceManagement />} />
              <Route path="availability" element={<AvailabilityManagement />} />
              <Route path="manual-booking" element={<ManualBookingPage currentUser={currentUser} />} />
            </Route>
          </Routes>
        </main>
      </div>
    </Router>
  );
}
export default App;