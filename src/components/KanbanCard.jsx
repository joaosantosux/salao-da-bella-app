import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styled from 'styled-components';

// Adicionei alguns styled-components para deixar o card mais informativo
const CardContainer = styled.div`
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 16px;
  margin-bottom: 12px;
  cursor: grab;
  border-left: 5px solid ${props => props.$statusColor || '#4a90e2'};
  &:active { cursor: grabbing; }
`;

const CardHeader = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
`;

const CardBody = styled.div`
  font-size: 0.875rem;
  color: #666;
  p { margin: 4px 0; }
`;

const AppointmentInfo = styled.div`
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eee;
  font-size: 0.9em;
  p {
    font-weight: 500;
    color: #333;
  }
`;

export function KanbanCard({ id, user }) {
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
            default: return '#4a90e2'; // Azul padrão
        }
    };

    return (
        <CardContainer
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            $statusColor={getStatusColor(user.status)}
        >
            <CardHeader>{user.name || 'Nome não disponível'}</CardHeader>
            <CardBody>
                <p>{user.email || 'Email não disponível'}</p>
            </CardBody>

            {/* --- PASSO 3: Exibindo as informações do agendamento --- */}
            {user.appointmentInfo && (
                <AppointmentInfo>
                    <p>{user.appointmentInfo.serviceName}</p>
                    <p>{user.appointmentInfo.date} às {user.appointmentInfo.time}</p>
                </AppointmentInfo>
            )}
        </CardContainer>
    );
}