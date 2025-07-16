import React from 'react';
import ServiceList from '../components/ServiceList';

function HomePage() {
    return (
        <div>
            <h2>Nossos Serviços</h2>
            <p>Seja bem-vindo! Escolha um serviço abaixo para ver os detalhes e agendar.</p>
            <ServiceList />
        </div>
    );
}

export default HomePage;