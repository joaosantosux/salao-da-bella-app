import React from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { KanbanCard } from './KanbanCard.jsx';
import styled from 'styled-components';

const ColumnContainer = styled.div`
  background-color: #333; /* Cor escura para a coluna */
  color: #fff;
  padding: 15px;
  border-radius: 8px;
  min-height: 200px;
  display: flex;
  flex-direction: column;
`;

const ColumnTitle = styled.h3`
  text-align: center;
  margin-top: 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #555;
`;

// --- CORREÇÃO DO ERRO .map() AQUI ---
// Adicionamos `= []` para garantir que 'items' seja sempre um array.
export function KanbanColumn({ id, title, items = [] }) {
    const { setNodeRef } = useDroppable({ id });

    return (
        <ColumnContainer ref={setNodeRef}>
            <ColumnTitle>{title}</ColumnTitle>
            <SortableContext id={id} items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                {items.map(user => (
                    <KanbanCard key={user.id} id={user.id} user={user} />
                ))}
            </SortableContext>
        </ColumnContainer>
    );
}