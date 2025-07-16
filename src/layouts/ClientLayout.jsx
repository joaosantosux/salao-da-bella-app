import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import './ClientLayout.css'; // Usaremos este CSS para estilizar

function ClientLayout() {
    return (
        <div className="client-layout-container">
            {/* O menu que ficará sempre visível para o cliente */}
            <nav className="client-nav">
                <NavLink to="/servicos" end>Serviços</NavLink>
                <NavLink to="/meus-agendamentos">Meus Agendamentos</NavLink>
            </nav>

            {/* O conteúdo (lista de serviços ou lista de agendamentos) será renderizado aqui */}
            <div className="client-content-area">
                <Outlet />
            </div>
        </div>
    );
}

export default ClientLayout;