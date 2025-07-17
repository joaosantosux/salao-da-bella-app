import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { DndContext, closestCenter, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { KanbanColumn } from '../components/KanbanColumn';
import { KanbanCard } from '../components/KanbanCard';
import toast from 'react-hot-toast';
import './KanbanPage.css';

const KANBAN_COLUMNS = {
    cadastrado: { id: 'cadastrado', title: 'Cadastrado' },
    agendado: { id: 'agendado', title: 'Agendado' },
    realizado: { id: 'realizado', title: 'Procedimento Realizado' },
    pago: { id: 'pago', title: 'Pagamento Efetuado' },
};

function KanbanPage() {
    const [users, setUsers] = useState([]);
    const [columns, setColumns] = useState(null); // Inicia como nulo
    const [activeUser, setActiveUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const sensors = useSensors(useSensor(PointerSensor));

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

    useEffect(() => {
        const newColumns = {};
        Object.values(KANBAN_COLUMNS).forEach(column => {
            newColumns[column.id] = { ...column, items: [] };
        });

        users.forEach(user => {
            const statusKey = (user.status || 'cadastrado').toLowerCase();
            if (newColumns[statusKey]) {
                newColumns[statusKey].items.push(user);
            } else {
                newColumns.cadastrado.items.push(user);
            }
        });
        setColumns(newColumns);
    }, [users]);

    const handleDragStart = (event) => {
        setActiveUser(users.find(u => u.id === event.active.id) || null);
    };

    const handleDragEnd = async (event) => {
        setActiveUser(null);
        const { active, over } = event;

        if (!over || active.id === over.id) return;

        const activeContainer = active.data.current?.sortable?.containerId;
        const overContainer = over.data.current?.sortable?.containerId || over.id;

        if (!activeContainer || !overContainer || activeContainer === overContainer) return;

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
            toast.success(`Cliente movido para "${KANBAN_COLUMNS[newStatus].title}"!`);
        } catch (error) {
            toast.error("Erro ao atualizar o status do cliente.");
            fetchUsers();
        }
    };

    if (loading) { return <p>Carregando jornada dos clientes...</p>; }

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