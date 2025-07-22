import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
// Import completo com todas as funções necessárias
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where, writeBatch, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import Calendar from 'react-calendar';
import { CancelAppointmentsModal } from '../components/CancelAppointmentsModal.jsx';
import '../components/Calendar.css';
import './AvailabilityManagement.css';

const daysOfWeek = [
    { label: 'Domingo', value: 0 }, { label: 'Segunda-feira', value: 1 },
    { label: 'Terça-feira', value: 2 }, { label: 'Quarta-feira', value: 3 },
    { label: 'Quinta-feira', value: 4 }, { label: 'Sexta-feira', value: 5 },
    { label: 'Sábado', value: 6 },
];

function AvailabilityManagement() {
    // Seus estados originais, com a sintaxe corrigida
    const [workingDays, setWorkingDays] = useState({});
    const [timeSlotsText, setTimeSlotsText] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [overrideTimeSlotsText, setOverrideTimeSlotsText] = useState('');
    const [isOverride, setIsOverride] = useState(false);
    const [overrideDates, setOverrideDates] = useState([]);

    // Novos estados para o modal de conflito
    const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
    const [conflictingAppointments, setConflictingAppointments] = useState([]);
    const [modalAction, setModalAction] = useState(null); // 'save' ou 'delete'

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const settingsRef = doc(db, 'settings', 'availability');
            const settingsSnap = await getDoc(settingsRef);
            if (settingsSnap.exists()) {
                const data = settingsSnap.data();
                const days = {};
                daysOfWeek.forEach(day => {
                    days[day.value] = data.workingDays.includes(day.value);
                });
                setWorkingDays(days);
                const defaultTimes = data.defaultTimeSlots.join('\n');
                setTimeSlotsText(defaultTimes);
            }
            const overridesCollection = collection(db, 'availabilityOverrides');
            const querySnapshot = await getDocs(overridesCollection);
            const dates = querySnapshot.docs.map(doc => doc.id);
            setOverrideDates(dates);
        } catch (error) {
            console.error("Erro ao buscar dados:", error);
            toast.error("Falha ao buscar configurações de disponibilidade.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    useEffect(() => {
        if (loading) return;
        const fetchOverrideForSelectedDate = async () => {
            const dateString = selectedDate.toISOString().split('T')[0];
            const overrideDocRef = doc(db, 'availabilityOverrides', dateString);
            const docSnap = await getDoc(overrideDocRef);
            if (docSnap.exists()) {
                setOverrideTimeSlotsText(docSnap.data().timeSlots.join('\n'));
                setIsOverride(true);
            } else {
                setOverrideTimeSlotsText(timeSlotsText);
                setIsOverride(false);
            }
        };
        fetchOverrideForSelectedDate();
    }, [selectedDate, loading, timeSlotsText]);

    const handleDayChange = (dayValue) => {
        setWorkingDays(prev => ({ ...prev, [dayValue]: !prev[dayValue] }));
    };

    const handleSaveDefaults = async () => {
        // ... (Sua lógica original aqui) ...
    };

    const saveAvailability = async (timeSlots) => {
        const dateString = selectedDate.toISOString().split('T')[0];
        const overrideDocRef = doc(db, 'availabilityOverrides', dateString);
        await setDoc(overrideDocRef, { timeSlots });
        if (!overrideDates.includes(dateString)) {
            setOverrideDates(prevDates => [...prevDates, dateString]);
        }
        setIsOverride(true);
    };

    const performDeleteOverride = async () => {
        const dateString = selectedDate.toISOString().split('T')[0];
        await deleteDoc(doc(db, "availabilityOverrides", dateString));
        setIsOverride(false);
        setOverrideTimeSlotsText(timeSlotsText);
        setOverrideDates(overrideDates.filter(d => d !== dateString));
    };

    const handleSaveOverride = async () => {
        setModalAction('save');
        const newTimeSlots = overrideTimeSlotsText.split('\n').filter(slot => slot.trim() !== '');
        const formattedDate = selectedDate.toLocaleDateString('pt-BR');
        try {
            const bookingsQuery = query(collection(db, 'agendamentos'), where('date', '==', formattedDate), where('status', '==', 'Agendado'));
            const bookingsSnap = await getDocs(bookingsQuery);
            const existingBookings = bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const conflicts = existingBookings.filter(booking => !newTimeSlots.includes(booking.time));
            if (conflicts.length > 0) {
                setConflictingAppointments(conflicts);
                setIsConflictModalOpen(true);
            } else {
                await saveAvailability(newTimeSlots);
                toast.success(`Horários para ${formattedDate} foram salvos!`);
            }
        } catch (error) {
            toast.error("Ocorreu um erro ao verificar os agendamentos.");
            console.error("Erro na verificação de conflitos:", error);
        }
    };

    const handleDeleteOverride = () => {
        toast((t) => (
            <div className="confirmation-toast">
                <h4>Remover Exceção?</h4>
                <p>Os horários para {selectedDate.toLocaleDateString('pt-BR')} voltarão ao padrão.</p>
                <div className="toast-buttons">
                    <button className="confirm-button-toast" onClick={async () => {
                        toast.dismiss(t.id);
                        setModalAction('delete');
                        const defaultTimeSlots = timeSlotsText.split('\n').filter(slot => slot.trim() !== '');
                        const formattedDate = selectedDate.toLocaleDateString('pt-BR');
                        try {
                            const bookingsQuery = query(collection(db, 'agendamentos'), where('date', '==', formattedDate), where('status', '==', 'Agendado'));
                            const bookingsSnap = await getDocs(bookingsQuery);
                            const existingBookings = bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                            const conflicts = existingBookings.filter(booking => !defaultTimeSlots.includes(booking.time));
                            if (conflicts.length > 0) {
                                setConflictingAppointments(conflicts);
                                setIsConflictModalOpen(true);
                            } else {
                                await performDeleteOverride();
                                toast.success('Exceção removida com sucesso!');
                            }
                        } catch (error) {
                            toast.error("Erro ao verificar conflitos.");
                        }
                    }}>
                        Sim, remover
                    </button>
                    <button className="cancel-button-toast" onClick={() => toast.dismiss(t.id)}>Não</button>
                </div>
            </div>
        ));
    };

    const handleConfirmConflictResolution = async () => {
        try {
            if (modalAction === 'save') {
                const newTimeSlots = overrideTimeSlotsText.split('\n').filter(slot => slot.trim() !== '');
                await saveAvailability(newTimeSlots);
            } else if (modalAction === 'delete') {
                await performDeleteOverride();
            }

            const batch = writeBatch(db);
            const affectedUserIds = [...new Set(conflictingAppointments.map(app => app.userId).filter(id => id))];

            conflictingAppointments.forEach(app => {
                batch.update(doc(db, 'agendamentos', app.id), { status: 'Cancelado' });
            });
            await batch.commit();

            for (const userId of affectedUserIds) {
                const otherBookingsQuery = query(collection(db, "agendamentos"), where("userId", "==", userId), where("status", "==", "Agendado"));
                const snapshot = await getDocs(otherBookingsQuery);
                if (snapshot.empty) {
                    await updateDoc(doc(db, "users", userId), { status: "desistente" });
                }
            }

            toast.success('Ação concluída e agendamentos conflitantes cancelados!');
        } catch (error) {
            toast.error("Erro ao processar a ação com conflitos.");
            console.error("Erro na resolução de conflitos:", error);
        } finally {
            setIsConflictModalOpen(false);
            setConflictingAppointments([]);
            setModalAction(null);
        }
    };

    const tileClassName = ({ date, view }) => {
        if (view === 'month') {
            const dateString = date.toISOString().split('T')[0];
            if (overrideDates.includes(dateString)) {
                return 'react-calendar__tile--override';
            }
        }
        return null;
    };

    if (loading) return <p>Carregando configurações...</p>;

    return (
        <>
            <div className="availability-container">
                <div className="availability-section">
                    <h3>Dias de Trabalho Padrão</h3>
                    <p>Marque os dias da semana em que o salão estará aberto.</p>
                    <div className="days-checkboxes">{daysOfWeek.map(day => (<label key={day.value} className="day-label"><input type="checkbox" checked={!!workingDays[day.value]} onChange={() => handleDayChange(day.value)} /> {day.label} </label>))}</div>
                </div>
                <div className="availability-section">
                    <h3>Horários de Atendimento Padrão</h3>
                    <p>Digite os horários disponíveis, um por linha (ex: 09:00).</p>
                    <textarea className="time-slots-textarea" value={timeSlotsText} onChange={(e) => setTimeSlotsText(e.target.value)} rows="10" />
                </div>
                <button onClick={handleSaveDefaults} className="save-availability-button">Salvar Configurações Padrão</button>
                <div className="availability-section override-section">
                    <h3>Exceções e Horários Especiais</h3>
                    <p>Clique em um dia no calendário para definir horários específicos ou bloquear um dia (deixando a caixa de horários vazia).</p>
                    <div className="override-content">
                        <div className="override-calendar"><Calendar onChange={setSelectedDate} value={selectedDate} tileClassName={tileClassName} /></div>
                        <div className="override-editor">
                            <h4>Editando horários para: <strong>{selectedDate.toLocaleDateString('pt-BR')}</strong></h4>
                            {isOverride && <p className="override-notice">Este dia tem uma regra de exceção salva.</p>}
                            <textarea className="time-slots-textarea" value={overrideTimeSlotsText} onChange={(e) => setOverrideTimeSlotsText(e.target.value)} rows="10" />
                            <button onClick={handleSaveOverride} className="save-override-button">Salvar Horários para este Dia</button>
                            {isOverride && (<button onClick={handleDeleteOverride} className="delete-override-button">Remover Exceção</button>)}
                        </div>
                    </div>
                </div>
            </div>

            <CancelAppointmentsModal
                isOpen={isConflictModalOpen}
                onClose={() => setIsConflictModalOpen(false)}
                title={`Atenção! Conflito de Agendamentos`}
                message={`Esta ação cancelará os ${conflictingAppointments.length} agendamentos abaixo:`}
                appointments={conflictingAppointments}
                onConfirm={handleConfirmConflictResolution}
                showCheckboxes={false}
            />
        </>
    );
}

export default AvailabilityManagement;