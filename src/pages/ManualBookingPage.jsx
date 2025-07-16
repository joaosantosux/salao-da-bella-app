import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebaseConfig';
import { collection, getDocs, doc, getDoc, addDoc, query, where } from 'firebase/firestore';
import Calendar from 'react-calendar';
import toast from 'react-hot-toast';
import { useAvailability } from '../hooks/useAvailability';
import './ManualBookingPage.css';

// AQUI ESTÁ A CORREÇÃO: Adicionamos { currentUser } nos parênteses
// para que o componente "receba" a informação do usuário logado.
function ManualBookingPage({ currentUser }) {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [clientName, setClientName] = useState('');
  const [date, setDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(null);
  const { availableSlots, loading: availabilityLoading } = useAvailability(date);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchServices = async () => {
      const servicesCollectionRef = collection(db, 'servicos');
      const data = await getDocs(servicesCollectionRef);
      setServices(data.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    };
    fetchServices();
  }, []);

  useEffect(() => {
    setSelectedTime(null);
  }, [date, selectedService]);

  const handleSaveBooking = async () => {
    if (!clientName || !selectedService || !date || !selectedTime) {
      return toast.error("Preencha todos os campos: Cliente, Serviço, Data e Horário.");
    }
    // Agora o currentUser não será mais indefinido
    if (!currentUser) {
      return toast.error("Erro: Administrador não identificado. Tente fazer login novamente.");
    }

    try {
      await addDoc(collection(db, "agendamentos"), {
        userName: clientName,
        adminId: currentUser.uid,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        servicePrice: selectedService.price,
        date: date.toLocaleDateString('pt-BR'),
        time: selectedTime,
      });
      toast.success("Agendamento manual criado com sucesso!");
      navigate('/admin');
    } catch (error) {
      toast.error("Erro ao criar agendamento.");
      console.error("Erro no agendamento manual:", error);
    }
  };

  return (
    <div className="manual-booking-container">
      <h2>Agendamento Manual</h2>
      <div className="booking-steps">
        <div className="step">
          <h3>1. Selecione um Serviço</h3>
          <div className="service-selection-list">
            {services.map(service => (
              <button key={service.id} onClick={() => setSelectedService(service)} className={`service-button ${selectedService?.id === service.id ? 'selected' : ''}`}>
                {service.name}
              </button>
            ))}
          </div>
        </div>
        {selectedService && (
          <>
            <div className="step">
              <h3>2. Digite o Nome do Cliente</h3>
              <input type="text" placeholder="Nome do cliente" value={clientName} onChange={(e) => setClientName(e.target.value)} className="client-name-input" />
            </div>
            <div className="step">
              <h3>3. Selecione a Data e Horário</h3>
              <div className="calendar-time-wrapper">
                <Calendar onChange={setDate} value={date} minDate={new Date()} />
                <div className="time-slots-wrapper">
                  {availabilityLoading ? <p>Verificando...</p> : availableSlots.length > 0 ? (
                    availableSlots.map(time => (
                      <button key={time} onClick={() => setSelectedTime(time)} className={`time-slot-button ${selectedTime === time ? 'selected' : ''}`}>{time}</button>
                    ))
                  ) : <p>Nenhum horário disponível.</p>}
                </div>
              </div>
            </div>
            {selectedTime && clientName && (
              <div className="step">
                <h3>4. Confirmar Agendamento</h3>
                <div className="confirmation-summary">
                  <p><strong>Cliente:</strong> {clientName}</p>
                  <p><strong>Serviço:</strong> {selectedService.name}</p>
                  <p><strong>Data:</strong> {date.toLocaleDateString('pt-BR')}</p>
                  <p><strong>Horário:</strong> {selectedTime}</p>
                </div>
                <button onClick={handleSaveBooking} className="save-booking-button">Salvar Agendamento</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ManualBookingPage;