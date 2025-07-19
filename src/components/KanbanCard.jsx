import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styled, { css } from 'styled-components';

const CardContainer = styled.div`
  background-color: #444;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  cursor: grab;
  color: #fff;
  border-left: 5px solid ${props => props.$statusColor || '#4a90e2'};
  
  &:active { cursor: grabbing; }

  /* Estilo especial para o card "fantasma" que está sendo arrastado */
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
      case 'agendado': return '#f0ad4e'; // Laranja
      case 'realizado': return '#5cb85c'; // Verde
      case 'desistente': return '#d9534f'; // Vermelho
      case 'contatado': return '#5bc0de'; // Azul claro
      // --- MUDANÇA AQUI: Adicionamos a cor para o novo status ---
      case 'nao_compareceu': return '#777777'; // Cinza
      default: return '#5DADE2'; // Azul padrão
    }
  };

  return (
    <CardContainer
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      $statusColor={getStatusColor(user.status)}
      $isDragging={isDragging}
    >
      <CardHeader>{user.name || 'Nome não disponível'}</CardHeader>
      <CardBody>
        <p>{user.email || 'Email não disponível'}</p>
      </CardBody>

      {/* Bloco que exibe as informações do agendamento */}
      {user.appointmentInfo && (
        <AppointmentInfo>
          <p>Próximo: {user.appointmentInfo.serviceName}</p>
          <p>{user.appointmentInfo.date} às {user.appointmentInfo.time}</p>

          {/* Indicador de múltiplos agendamentos */}
          {user.appointmentInfo.count > 1 && (
            <MoreAppointmentsIndicator>
              (+{user.appointmentInfo.count - 1} outro agendamento)
            </MoreAppointmentsIndicator>
          )}
        </AppointmentInfo>
      )}
    </CardContainer>
  );
}