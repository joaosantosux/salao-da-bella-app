import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { KanbanCard } from './KanbanCard';

export function KanbanColumn({ id, title, items }) {
    const { setNodeRef } = useDroppable({ id });

    return (
        <div className="kanban-column" ref={setNodeRef}>
            <h3>{title}</h3>
            <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
                <div className="kanban-column-cards">
                    {items.map(item => (
                        <KanbanCard key={item.id} id={item.id} booking={item} />
                    ))}
                </div>
            </SortableContext>
        </div>
    );
}