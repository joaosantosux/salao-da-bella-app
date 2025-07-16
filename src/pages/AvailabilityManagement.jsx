// Cole no src/pages/AvailabilityManagement.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
import Calendar from 'react-calendar';
import '../components/Calendar.css';
import './AvailabilityManagement.css';

const daysOfWeek = [
    { label: 'Domingo', value: 0 }, { label: 'Segunda-feira', value: 1 },
    { label: 'Terça-feira', value: 2 }, { label: 'Quarta-feira', value: 3 },
    { label: 'Quinta-feira', value: 4 }, { label: 'Sexta-feira', value: 5 },
    { label: 'Sábado', value: 6 },
];

function AvailabilityManagement() {
    const [workingDays, setWorkingDays] = useState({});
    const [timeSlotsText, setTimeSlotsText] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [overrideTimeSlotsText, setOverrideTimeSlotsText] = useState('');
    const [isOverride, setIsOverride] = useState(false);
    const [overrideDates, setOverrideDates] = useState([]);

    const fetchAllData = async () => {
        setLoading(true);
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
        setLoading(false);
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    useEffect(() => {
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
        if (!loading) {
            fetchOverrideForSelectedDate();
        }
    }, [selectedDate, loading, timeSlotsText]);

    const handleDayChange = (dayValue) => {
        setWorkingDays(prev => ({ ...prev, [dayValue]: !prev[dayValue] }));
    };

    const handleSaveDefaults = async () => {
        try {
            const enabledDays = Object.keys(workingDays).filter(day => workingDays[day]).map(Number);
            const timeSlots = timeSlotsText.split('\n').filter(slot => slot.trim() !== '');
            await setDoc(doc(db, 'settings', 'availability'), { workingDays: enabledDays, defaultTimeSlots: timeSlots });
            toast.success('Configurações padrão salvas!');
        } catch (error) {
            toast.error('Erro ao salvar as configurações.');
        }
    };

    const handleSaveOverride = async () => {
        const dateString = selectedDate.toISOString().split('T')[0];
        const overrideDocRef = doc(db, 'availabilityOverrides', dateString);
        try {
            const timeSlots = overrideTimeSlotsText.split('\n').filter(slot => slot.trim() !== '');
            await setDoc(overrideDocRef, { timeSlots });
            toast.success(`Horários para ${selectedDate.toLocaleDateString('pt-BR')} foram salvos!`);
            if (!overrideDates.includes(dateString)) {
                setOverrideDates([...overrideDates, dateString]);
            }
            setIsOverride(true);
        } catch (error) {
            toast.error("Erro ao salvar exceção.");
        }
    };

    const handleDeleteOverride = () => {
        const dateString = selectedDate.toISOString().split('T')[0];
        toast((t) => (
            <div className="confirmation-toast">
                <h4>Remover Exceção?</h4>
                <p>Os horários para {selectedDate.toLocaleDateString('pt-BR')} voltarão ao padrão.</p>
                <div className="toast-buttons">
                    <button className="confirm-button-toast" onClick={async () => {
                        toast.dismiss(t.id);
                        try {
                            await deleteDoc(doc(db, "availabilityOverrides", dateString));
                            setIsOverride(false);
                            setOverrideTimeSlotsText(timeSlotsText);
                            setOverrideDates(overrideDates.filter(d => d !== dateString));
                            toast.success('Exceção removida com sucesso!');
                        } catch (error) {
                            toast.error('Erro ao remover exceção.');
                        }
                    }}>
                        Sim, remover
                    </button>
                    <button className="cancel-button-toast" onClick={() => toast.dismiss(t.id)}>
                        Não
                    </button>
                </div>
            </div>
        ));
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
                        {isOverride && (<button onClick={handleDeleteOverride} className="delete-override-button">Remover Exceção (Voltar ao Padrão)</button>)}
                    </div>
                </div>
                <div className="calendar-legend">
                    <div className="legend-item"><span className="legend-color-dot override"></span> Dias com Exceção</div>
                </div>
            </div>
        </div>
    );
}
export default AvailabilityManagement;