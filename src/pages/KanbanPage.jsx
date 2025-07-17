import React, { useState, useEffect } from 'react';
// A importação do 'db' também precisa do caminho correto
import { db } from '../firebaseConfig.js';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { DndContext, closestCenter, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

// --- INÍCIO DA CORREÇÃO ---
// 1. Importando KanbanColumn como 'default' (sem chaves) e com o caminho correto.
import { KanbanColumn } from '../components/KanbanColumn.jsx';
// 2. Importando KanbanCard como 'named' (com chaves) e com o caminho correto.
import { KanbanCard } from '../components/KanbanCard.jsx';
// --- FIM DA CORREÇÃO ---

import toast from 'react-hot-toast';
// O CSS também pode precisar de ajuste de caminho se você o moveu
import './KanbanPage.css';

const KANBAN_COLUMNS = {
    cadastrado: { id: 'cadastrado', title: 'Cadastrado' },
    agendado: { id: 'agendado', title: 'Agendado' },
    realizado: { id: 'realizado', title: 'Procedimento Realizado' },
    // Adicionei as colunas que faltavam da sua implementação anterior para consistência
    contatado: { id: 'contatado', title: 'Contatado' },
    desistente: { id: 'desistente', title: 'Desistente' },
};

export function KanbanPage() {
    // Sua lógica de state, que está correta, é mantida
    const [users, setUsers] = useState([]);
    const [columns, setColumns] = useState(null);
    const [activeUser, setActiveUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const sensors = useSensors(useSensor(PointerSensor));

    // Sua função de busca, mantida intacta
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const usersQuery = query(collection(db, "users"), where("role", "==", "customer"));
            const querySnapshot = await getDocs(usersQuery);
            const allUsers = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate()
            }));
            console.log("CLIENTES BUSCADOS:", allUsers);
            setUsers(allUsers);
        } catch (error) {
            console.error("Erro ao buscar clientes para o Kanban:", error);
            toast.error("Não foi possível carregar os clientes. Verifique as regras do Firestore.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Seu useEffect para processar os dados, mantido intacto
    useEffect(() => {
        if (!users) return;
        const newColumns = {};
        Object.values(KANBAN_COLUMNS).forEach(column => {
            newColumns[column.id] = { ...column, items: [] };
        });

        users.forEach(user => {
            const statusKey = (user.status || 'cadastrado').toLowerCase();
            if (newColumns[statusKey]) {
                newColumns[statusKey].items.push(user);
            } else if (newColumns.cadastrado) {
                // Fallback mais seguro
                newColumns.cadastrado.items.push(user);
            }
        });
        setColumns(newColumns);
    }, [users]);

    // Suas funções de drag-and-drop, mantidas intactas
    const handleDragStart = (event) => {
        setActiveUser(users.find(u => u.id === event.active.id) || null);
    };

    const handleDragEnd = async (event) => {
        setActiveUser(null);
        const { active, over } = event;

        if (!over) return;

        const activeContainer = active.data.current?.sortable?.containerId;
        const overContainer = over.data.current?.sortable?.containerId || over.id;

        if (!activeContainer || !overContainer || activeContainer === overContainer) {
            return;
        }

        setUsers((prevUsers) => {
            const activeIndex = prevUsers.findIndex((u) => u.id === active.id);
            if (activeIndex === -1) return prevUsers;
            const newStatus = overContainer;
            const updatedUsers = [...prevUsers];
            updatedUsers[activeIndex] = { ...updatedUsers[activeIndex], status: newStatus };
            return updatedUsers;
        });

        try {
            const userRef = doc(db, 'users', active.id);
            const newStatus = overContainer;
            await updateDoc(userRef, { status: newStatus });
            toast.success(`Cliente movido para "${KANBAN_COLUMNS[newStatus]?.title || newStatus}"!`);
        } catch (error) {
            toast.error("Erro ao atualizar o status do cliente.");
            fetchUsers();
        }
    };

    if (loading) { return <p>Carregando jornada dos clientes...</p>; }

    // Sua renderização, mantida intacta
    return (
        <div className="kanban-container">
            <h2>Jornada do Cliente</h2>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="kanban-board">
                    {columns && Object.values(columns).map(column => (
                        <KanbanColumn
                            key={column.id}
                            id={column.id}
                            title={column.title}
                            items={column.items}
                        />
                    ))}
                </div>
                <DragOverlay>
                    {activeUser ? <KanbanCard id={activeUser.id} user={activeUser} isOverlay /> : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
export default KanbanPage;