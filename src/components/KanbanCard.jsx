import React from 'react';
import { Link } from 'react-router-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styled, { css } from 'styled-components';

// --- COMPONENTE DO PUXADOR E ÍCONE ---
const DragHandle = styled.div`
  position: absolute;
  top: 5px;
  right: 5px;
  padding: 10px;
  cursor: grab;
  color: #a0a0a0; /* Cor mais clara para melhor contraste */
  
  /* Propriedades de toque movidas para cá */
  touch-action: none; 
  user-select: none;
  -webkit-user-select: none;
  -ms-user-select: none;
  -webkit-tap-highlight-color: transparent;
  
  &:hover {
    color: #fff;
  }
`;

const GripIcon = () => (
  <svg width="12" height="20" viewBox="0 0 8 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="2" cy="2" r="2" fill="currentColor" />
    <circle cx="6" cy="2" r="2" fill="currentColor" />
    <circle cx="2" cy="8" r="2" fill="currentColor" />
    <circle cx="6" cy="8" r="2" fill="currentColor" />
    <circle cx="2" cy="14" r="2" fill="currentColor" />
    <circle cx="6" cy="14" r="2" fill="currentColor" />
  </svg>
);
// --- FIM DO COMPONENTE DO PUXADOR ---

const StyledLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  display: block;
`;

const CardContainer = styled.div.attrs(() => ({
  // Adiciona um atributo de dados ao elemento div final
  'data-drag-scroll-ignore': true
}))`
  background-color: #444;
  border-radius: 8px;
  padding: 16px;
  padding-right: 40px; /* Adiciona espaço para o puxador não sobrepor o texto */
  margin-bottom: 12px;
  color: #fff;
  border-left: 5px solid ${props => props.$statusColor || '#4a90e2'};
  position: relative; /* Necessário para posicionar o puxador */

  /* Removemos as propriedades de toque daqui para permitir a rolagem */
  
  ${props => props.$isDragging && css`
    box-shadow: 0 10px 15px rgba(0,0,0,0.25);
    transform: scale(1.05);
    opacity: 0.9;
  `}
`;

const CardHeader = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 8px 0;
  word-break: break-word;
`;

const CardBody = styled.div`
  font-size: 0.875rem;
  color: #ccc;
  p { margin: 4px 0; }
`;

const AppointmentInfo = styled.div`
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #555;
  font-size: 0.9em;
  p { 
    font-weight: 500;
    margin: 4px 0;
  }
`;

const MoreAppointmentsIndicator = styled.p`
  font-size: 0.8em;
  font-style: italic;
  color: #a0a0a0;
  text-align: right;
  margin-top: 8px !important;
  margin-bottom: 0 !important;
`;

export function KanbanCard({ id, user, isDragging }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'agendado': return '#f0ad4e';
      case 'realizado': return '#5cb85c';
      case 'desistente': return '#d9534f';
      case 'contatado': return '#5bc0de';
      case 'nao_compareceu': return '#777777';
      default: return '#5DADE2';
    }
  };

  return (
    <StyledLink to={`/admin/cliente/${user.id}`}>
      <CardContainer
        ref={setNodeRef}
        style={style}
        {...attributes}
        $statusColor={getStatusColor(user.status)}
        $isDragging={isDragging}
      >
        <DragHandle {...listeners}>
          <GripIcon />
        </DragHandle>

        <CardHeader>{user.name || 'Nome não disponível'}</CardHeader>
        <CardBody>
          <p>{user.email || 'Email não disponível'}</p>
        </CardBody>

        {user.appointmentInfo && (
          <AppointmentInfo>
            <p>Próximo: {user.appointmentInfo.serviceName}</p>
            <p>{user.appointmentInfo.date} às {user.appointmentInfo.time}</p>
            {user.appointmentInfo.count > 1 && (
              <MoreAppointmentsIndicator>
                (+{user.appointmentInfo.count - 1} outro agendamento)
              </MoreAppointmentsIndicator>
            )}
          </AppointmentInfo>
        )}
      </CardContainer>
    </StyledLink>
  );
}