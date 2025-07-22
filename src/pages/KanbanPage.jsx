import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../firebaseConfig.js';
import { collection, query, where, getDocs, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { DndContext, DragOverlay, closestCorners, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { KanbanColumn } from '../components/KanbanColumn.jsx';
import { KanbanCard } from '../components/KanbanCard.jsx';
import { CancelAppointmentsModal } from '../components/CancelAppointmentsModal.jsx';
import styled from 'styled-components';
import toast from 'react-hot-toast';
import { useDrag } from '@use-gesture/react';

const KanbanContainer = styled.div`
  padding: 24px;
  background-color: #f0eade;
  overflow-x: auto;
  padding-bottom: 20px;
  cursor: ${props => (props.$isGrabbing ? 'grabbing' : 'grab')};
  user-select: none;
`;

const BoardContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: 20px;
  align-items: flex-start;
  width: max-content;
  pointer-events: ${props => (props.$isGrabbing ? 'none' : 'auto')};
`;

const KANBAN_COLUMNS = [
    { id: 'cadastrado', title: 'Novos Cadastros' },
    { id: 'contatado', title: 'Contatado' },
    { id: 'agendado', title: 'Agendado' },
    { id: 'realizado', title: 'Realizado' },
    { id: 'nao_compareceu', title: 'Não Compareceu' },
    { id: 'desistente', title: 'Desistente' },
];

export function KanbanPage() {
    const [users, setUsers] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeCard, setActiveCard] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState({ user: null, appointments: [] });
    const [isGrabbing, setIsGrabbing] = useState(false);
    const scrollRef = useRef(null);

    // Lógica de "arrastar para rolar" com velocidade controlada
    useDrag(
        ({ active, movement: [mx], event }) => {
            if (event.target.closest('[data-drag-scroll-ignore]')) return;
            setIsGrabbing(active);

            // Fator de velocidade: ajuste este valor como desejar
            const scrollSpeed = 0.1;

            if (scrollRef.current) {
                scrollRef.current.scrollLeft -= mx * scrollSpeed;
            }
        },
        {
            target: scrollRef,
            from: () => [-scrollRef.current.scrollLeft, 0],
            axis: 'x',
            preventScroll: true,
            filterTaps: true,
            threshold: 10,
        }
    );

    useEffect(() => {
        const handleNoShowCheck = async (currentUsers, currentAppointments) => {
            const now = new Date();
            const updates = [];
            let usersCopy = [...currentUsers];
            const scheduledUsers = usersCopy.filter(u => u.status === 'agendado');
            for (const user of scheduledUsers) {
                const userAppointments = currentAppointments.filter(app => app.userId === user.id && app.status === 'Agendado');
                if (userAppointments.length > 0) {
                    const futureAppointments = userAppointments.filter(app => {
                        const appDate = new Date(app.date.split('/').reverse().join('-') + `T${app.time}`);
                        return appDate > now;
                    });
                    if (futureAppointments.length === 0) {
                        const userDocRef = doc(db, 'users', user.id);
                        updates.push(updateDoc(userDocRef, { status: 'nao_compareceu' }));
                        const userIndex = usersCopy.findIndex(u => u.id === user.id);
                        if (userIndex !== -1) usersCopy[userIndex].status = 'nao_compareceu';
                    }
                }
            }
            if (updates.length > 0) {
                await Promise.all(updates);
                toast.success(`${updates.length} cliente(s) movido(s) para 'Não Compareceu'.`);
            }
            return usersCopy;
        };
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const usersQuery = query(collection(db, "users"), where("role", "==", "customer"));
                const appointmentsQuery = query(collection(db, "agendamentos"));
                const [usersSnapshot, appointmentsSnapshot] = await Promise.all([getDocs(usersQuery), getDocs(appointmentsQuery)]);
                let usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const appointmentsData = appointmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const updatedUsers = await handleNoShowCheck(usersData, appointmentsData);
                setUsers(updatedUsers);
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
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return users.map(user => {
            const futureAppointments = appointments.filter(app => {
                if (app.userId !== user.id || app.status !== 'Agendado') return false;
                const appDate = new Date(app.date.split('/').reverse().join('-'));
                return appDate >= today;
            }).sort((a, b) => new Date(a.date.split('/').reverse().join('-')) - new Date(b.date.split('/').reverse().join('-')));
            const nextAppointment = futureAppointments[0];
            if (nextAppointment) {
                return { ...user, appointmentInfo: { serviceName: nextAppointment.serviceName, date: nextAppointment.date, time: nextAppointment.time, count: futureAppointments.length } };
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

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 150, tolerance: 5 },
        })
    );

    function handleDragStart(event) {
        const card = enrichedUsers.find(user => user.id === event.active.id);
        setActiveCard(card);
    }

    async function handleDragEnd(event) {
        setActiveCard(null);
        const { active, over } = event;
        if (!over) return;
        const activeContainer = active.data.current?.sortable.containerId;
        const overContainer = over.data.current?.sortable.containerId || over.id;
        if (activeContainer && overContainer && activeContainer !== overContainer) {
            const activeUser = enrichedUsers.find(u => u.id === active.id);
            if (!activeUser) return;
            const userActiveAppointments = appointments.filter(app => app.userId === activeUser.id && app.status === 'Agendado');
            if ((overContainer === 'desistente' || overContainer === 'nao_compareceu') && userActiveAppointments.length > 1) {
                setModalData({ user: activeUser, appointments: userActiveAppointments });
                setIsModalOpen(true);
                return;
            }
            const workflow = ['cadastrado', 'contatado', 'agendado', 'realizado'];
            const fromIndex = workflow.indexOf(activeContainer);
            const toIndex = workflow.indexOf(overContainer);
            if (overContainer !== 'desistente' && overContainer !== 'nao_compareceu' && fromIndex > toIndex) {
                toast.error("Não é possível mover um cliente para uma etapa anterior.");
                return;
            }
            if (overContainer === 'realizado' && (activeContainer !== 'agendado')) {
                toast.error("Um cliente precisa ser 'Agendado' antes de 'Realizado'.");
                return;
            }
            const activeId = active.id;
            const newStatus = overContainer;
            const originalUsers = users;
            setUsers(prevUsers => prevUsers.map(user => user.id === activeId ? { ...user, status: newStatus } : user));
            try {
                await updateDoc(doc(db, 'users', activeId), { status: newStatus });
                toast.success('Status do cliente atualizado!');
                if ((newStatus === 'desistente' || newStatus === 'nao_compareceu' || newStatus === 'realizado') && userActiveAppointments.length > 0) {
                    const batch = writeBatch(db);
                    const newAppointmentStatus = (newStatus === 'realizado') ? 'Realizado' : 'Cancelado';
                    userActiveAppointments.forEach(app => {
                        batch.update(doc(db, "agendamentos", app.id), { status: newAppointmentStatus });
                    });
                    await batch.commit();
                    setAppointments(prev => prev.map(app => app.userId === activeId && app.status === 'Agendado' ? { ...app, status: newAppointmentStatus } : app));
                    toast(`Agendamentos ativos do cliente foram marcados como '${newAppointmentStatus}'.`);
                }
            } catch (error) {
                console.error("ERRO DETALHADO AO ATUALIZAR AGENDAMENTOS:", error);
                toast.error('Falha ao atualizar o status.');
                setUsers(originalUsers);
            }
        }
    }

    const handleConfirmCancellation = async (appointmentIdsToCancel) => {
        const { user } = modalData;
        try {
            const batch = writeBatch(db);
            appointmentIdsToCancel.forEach(id => {
                const docRef = doc(db, 'agendamentos', id);
                batch.update(docRef, { status: 'Cancelado' });
            });
            await batch.commit();
            setAppointments(prev => prev.map(app => appointmentIdsToCancel.includes(app.id) ? { ...app, status: 'Cancelado' } : app));
            const remainingAppointments = appointments.filter(app => app.userId === user.id && app.status === 'Agendado' && !appointmentIdsToCancel.includes(app.id));
            if (remainingAppointments.length === 0) {
                await updateDoc(doc(db, 'users', user.id), { status: 'desistente' });
                setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: 'desistente' } : u));
                toast.success(`Todos agendamentos de ${user.name} cancelados. Cliente movido para Desistente.`);
            } else {
                toast.success(`${appointmentIdsToCancel.length} agendamento(s) cancelado(s).`);
            }
        } catch (error) {
            toast.error("Ocorreu um erro ao cancelar os agendamentos.");
            console.error(error);
        }
    };

    if (isLoading) {
        return <KanbanContainer>Carregando quadro...</KanbanContainer>;
    }

    return (
        <>
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <KanbanContainer ref={scrollRef} $isGrabbing={isGrabbing}>
                    <BoardContainer $isGrabbing={isGrabbing}>
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
            {modalData.user && (
                <CancelAppointmentsModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    user={modalData.user}
                    appointments={modalData.appointments}
                    onConfirm={handleConfirmCancellation}
                />
            )}
        </>
    );
}