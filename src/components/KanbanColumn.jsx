import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { KanbanCard } from './KanbanCard.jsx';

// AQUI: Mudamos de 'export default function' para 'export function'
export function KanbanColumn({ id, title, items }) {
    const { setNodeRef } = useDroppable({ id });

    return (
        <div className="kanban-column" ref={setNodeRef}>
            <h3>{title}</h3>
            <SortableContext id={id} items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                <div className="kanban-cards-container">
                    {items.map(item => (
                        <KanbanCard key={item.id} id={item.id} user={item} />
                    ))}
                </div>
            </SortableContext>
        </div>
    );
}