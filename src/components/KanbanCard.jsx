import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function KanbanCard({ id, user, isOverlay }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: id, data: { type: 'card', user: user } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const cardClassName = isOverlay ? "kanban-card dragging" : "kanban-card";

    if (!user) {
        return null;
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={cardClassName}>
            <strong>{user.name || 'Nome não disponível'}</strong>
            <p>{user.email || 'Email não disponível'}</p>
            {user.createdAt && <p className="card-date">Cadastrado em: {user.createdAt.toLocaleDateString('pt-BR')}</p>}
        </div>
    );
}