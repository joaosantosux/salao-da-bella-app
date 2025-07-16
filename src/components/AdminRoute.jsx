import React from 'react';
import { Navigate } from 'react-router-dom';

function AdminRoute({ currentUser, children }) {
  // Se não há usuário logado ou o cargo não é 'admin', redireciona para a home
  if (!currentUser || currentUser.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Se for admin, renderiza o conteúdo da página que ele está tentando acessar
  return children;
}

export default AdminRoute;