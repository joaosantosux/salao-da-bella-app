import React from 'react';
// Outlet é a mágica que renderiza as páginas "filhas"
import { NavLink, Outlet } from 'react-router-dom';
import './AdminLayout.css'; // Criaremos este CSS

function AdminLayout() {
    return (
        <div className="admin-layout-container">
            <h2>Painel do Administrador</h2>

            {/* O menu que ficará sempre visível */}
            <nav className="admin-nav">
                <NavLink to="/admin" end>Ver Agendamentos</NavLink>
                <NavLink to="/admin/kanban">Jornada do Cliente</NavLink>
                <NavLink to="/admin/manual-booking">Agendamento Manual</NavLink>
                <NavLink to="/admin/services">Gerenciar Serviços</NavLink>
                <NavLink to="/admin/availability">Disponibilidade</NavLink>
            </nav>

            {/* O conteúdo da página específica (Dashboard, Serviços, etc.) será renderizado aqui */}
            <div className="admin-content-area">
                <Outlet />
            </div>
        </div>
    );
}

export default AdminLayout;