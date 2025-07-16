import React from 'react';
import { Navigate } from 'react-router-dom';

function PublicOnlyRoute({ currentUser, children }) {
    // Se existe um usuário logado...
    if (currentUser) {
        // ...redireciona para a página inicial.
        return <Navigate to="/" replace />;
    }

    // Se não há usuário logado, permite que ele veja a página (Login/Signup).
    return children;
}

export default PublicOnlyRoute;