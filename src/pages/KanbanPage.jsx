import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebaseConfig.js';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { KanbanColumn } from '../components/KanbanColumn.jsx';
import { KanbanCard } from '../components/KanbanCard.jsx';
import styled from 'styled-components';
import toast from 'react-hot-toast';

const KanbanContainer = styled.div`
  padding: 24px;
  background-color: #f0eade;
`;
const BoardContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 20px;
  align-items: flex-start;
`;
const KANBAN_COLUMNS = [
    { id: 'cadastrado', title: 'Novos Cadastros' },
    { id: 'contatado', title: 'Contatado' },
    { id: 'agendado', title: 'Agendado' },
    { id: 'realizado', title: 'Realizado' },
    { id: 'desistente', title: 'Desistente' },
];

export function KanbanPage() {
    const [users, setUsers] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeCard, setActiveCard] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const usersQuery = query(collection(db, "users"), where("role", "==", "customer"));
                const appointmentsQuery = query(collection(db, "agendamentos"));
                const [usersSnapshot, appointmentsSnapshot] = await Promise.all([getDocs(usersQuery), getDocs(appointmentsQuery)]);
                const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const appointmentsData = appointmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setUsers(usersData);
                setAppointments(appointmentsData);
            } catch (error) {
                console.error("Erro ao buscar dados:", error);
                toast.error("Não foi possível carregar os dados do quadro.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const enrichedUsers = useMemo(() => {
        return users.map(user => {
            const userAppointment = appointments
                .filter(app => app.userId === user.id)
                .sort((a, b) => {
                    const dateA = a.date ? new Date(a.date.split('/').reverse().join('-')) : 0;
                    const dateB = b.date ? new Date(b.date.split('/').reverse().join('-')) : 0;
                    return dateB - dateA;
                })[0];
            if (userAppointment) {
                return {
                    ...user,
                    appointmentInfo: {
                        serviceName: userAppointment.serviceName,
                        date: userAppointment.date,
                        time: userAppointment.time,
                    }
                };
            }
            return user;
        });
    }, [users, appointments]);

    const columns = useMemo(() => {
        return KANBAN_COLUMNS.reduce((acc, column) => {
            acc[column.id] = enrichedUsers.filter(user => user.status === column.id);
            return acc;
        }, {});
    }, [enrichedUsers]);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    function handleDragStart(event) {
        const card = enrichedUsers.find(user => user.id === event.active.id);
        setActiveCard(card);
    }

    // --- AQUI ESTÁ A CORREÇÃO ---
    // Adicionamos a palavra 'async' antes da definição da função
    async function handleDragEnd(event) {
        setActiveCard(null);
        const { active, over } = event;
        if (!over) return;

        const activeContainer = active.data.current?.sortable.containerId;
        const overContainer = over.data.current?.sortable.containerId || over.id;

        if (activeContainer && overContainer && activeContainer !== overContainer) {
            // --- Nossas Regras de Negócio ---
            const workflow = ['cadastrado', 'contatado', 'agendado', 'realizado'];
            const fromIndex = workflow.indexOf(activeContainer);
            const toIndex = workflow.indexOf(overContainer);

            // Regra 1: Não permite mover para trás (a menos que seja para 'desistente')
            if (overContainer !== 'desistente' && fromIndex > toIndex) {
                toast.error("Não é possível mover um cliente para uma etapa anterior.");
                return; // Aborta a operação
            }

            // Regra 2: Não permite pular direto de 'cadastrado' ou 'contatado' para 'realizado'
            if (overContainer === 'realizado' && (activeContainer === 'cadastrado' || activeContainer === 'contatado')) {
                toast.error("Um cliente precisa ser 'Agendado' antes de 'Realizado'.");
                return; // Aborta a operação
            }
            // Se todas as regras passarem, o código continua normalmente...
            const activeId = active.id;
            const newStatus = overContainer;

            setUsers(prevUsers => prevUsers.map(user =>
                user.id === activeId ? { ...user, status: newStatus } : user
            ));

            try {
                await updateDoc(doc(db, 'users', activeId), { status: newStatus });
                toast.success('Status do cliente atualizado!');
            } catch (error) {
                toast.error('Falha ao atualizar o status.');
                // Reverte a mudança na UI em caso de erro no DB
                setUsers(prevUsers => prevUsers.map(user =>
                    user.id === activeId ? { ...user, status: activeContainer } : user
                ));
            }
        }
    }

    if (isLoading) {
        return <KanbanContainer>Carregando quadro...</KanbanContainer>;
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <KanbanContainer>
                <BoardContainer>
                    {KANBAN_COLUMNS.map(column => (
                        <SortableContext key={column.id} items={columns[column.id]?.map(u => u.id) || []}>
                            <KanbanColumn id={column.id} title={column.title} items={columns[column.id] || []} />
                        </SortableContext>
                    ))}
                </BoardContainer>
            </KanbanContainer>

            <DragOverlay>
                {activeCard ? <KanbanCard id={activeCard.id} user={activeCard} isDragging /> : null}
            </DragOverlay>
        </DndContext>
    );
}