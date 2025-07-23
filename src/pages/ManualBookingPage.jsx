import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig.js';
import { collection, getDocs, doc, addDoc, updateDoc, serverTimestamp, query, where, Timestamp } from 'firebase/firestore';
import Calendar from 'react-calendar';
import toast from 'react-hot-toast';
import { useAvailability } from '../hooks/useAvailability';
import Select from 'react-select';
import './ManualBookingPage.css';

const customSelectStyles = {
  control: (styles) => ({
    ...styles,
    backgroundColor: '#242424',
    borderColor: '#555',
    color: 'white',
    boxShadow: 'none',
    '&:hover': {
      borderColor: '#888',
    }
  }),
  menu: (styles) => ({
    ...styles,
    backgroundColor: '#2f2f2f',
  }),
  option: (styles, { isFocused, isSelected }) => ({
    ...styles,
    backgroundColor: isSelected ? '#646cff' : isFocused ? '#444' : '#2f2f2f',
    color: 'white',
    ':active': {
      backgroundColor: '#555',
    },
  }),
  singleValue: (styles) => ({ ...styles, color: 'white' }),
  input: (styles) => ({ ...styles, color: 'white' }),
};

export function ManualBookingPage({ currentUser }) {
  const [allClients, setAllClients] = useState([]);
  const [clientOptions, setClientOptions] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [clientMode, setClientMode] = useState('select');
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');

  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [date, setDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(null);
  const { availableSlots, loading: availabilityLoading } = useAvailability(date);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const servicesCollectionRef = collection(db, 'servicos');
        const servicesData = await getDocs(servicesCollectionRef);
        setServices(servicesData.docs.map(doc => ({ ...doc.data(), id: doc.id })));

        const clientsQuery = query(collection(db, "users"), where("role", "==", "customer"));
        const clientsData = await getDocs(clientsQuery);
        const clientsList = clientsData.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        clientsList.sort((a, b) => a.name.localeCompare(b.name));

        setAllClients(clientsList); // Guarda os dados completos dos clientes

        const options = clientsList.map(client => ({
          value: client.id,
          label: client.name
        }));
        setClientOptions(options); // Guarda apenas as opções para o Select

      } catch (error) {
        console.error("ERRO AO BUSCAR DADOS INICIAIS:", error);
        toast.error("Falha ao carregar dados da página.");
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    setSelectedTime(null);
  }, [date, selectedService]);

  // ==================================================================
  // INÍCIO DA ÁREA CORRIGIDA
  // ==================================================================

  const handleSaveBooking = async () => {
    if (!selectedService || !date || !selectedTime) {
      return toast.error("Preencha todos os campos: Serviço, Data e Horário.");
    }
    if (!currentUser) {
      return toast.error("Erro: Administrador não identificado. Tente fazer login novamente.");
    }

    let clientIdToUse = selectedUserId;
    let clientNameToUse = clientOptions.find(c => c.value === selectedUserId)?.label;

    if (clientMode === 'add') {
      if (!newClientName.trim()) {
        return toast.error("O nome do novo cliente é obrigatório.");
      }
      try {
        const newUserRef = await addDoc(collection(db, 'users'), {
          name: newClientName,
          email: newClientEmail || null,
          role: 'customer',
          status: 'cadastrado',
          createdAt: serverTimestamp(),
        });
        clientIdToUse = newUserRef.id;
        clientNameToUse = newClientName;
        toast.success(`Cliente "${newClientName}" criado com sucesso!`);
      } catch (error) {
        console.error("Erro ao criar novo cliente:", error);
        return toast.error("Não foi possível criar o novo cliente.");
      }
    }

    if (!clientIdToUse) {
      return toast.error("Selecione um cliente existente ou cadastre um novo.");
    }

    try {
      const bookingDateTime = new Date(date);
      const [hours, minutes] = selectedTime.split(':');
      bookingDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));

      await addDoc(collection(db, "agendamentos"), {
        userId: clientIdToUse,
        userName: clientNameToUse,
        adminId: currentUser.uid,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        servicePrice: selectedService.price,
        date: Timestamp.fromDate(bookingDateTime),
        time: selectedTime,
        status: 'Agendado',
      });

      const userDocRef = doc(db, 'users', clientIdToUse);
      await updateDoc(userDocRef, { status: 'agendado' });

      toast.success("Agendamento manual criado e status do cliente atualizado!");

      // A chamada correta para a notificação do admin
      await sendAdminWhatsAppNotification(
        clientNameToUse,
        selectedService.name,
        date.toLocaleDateString('pt-BR'),
        selectedTime
      );

      // Reset do formulário
      setSelectedService(null);
      setSelectedUserId(null);
      setClientMode('select');
      setNewClientName('');
      setNewClientEmail('');
      setDate(new Date());
      setSelectedTime(null);
    } catch (error) {
      toast.error("Erro ao criar agendamento.");
      console.error("Erro no agendamento manual:", error);
    }
  };

  const sendAdminWhatsAppNotification = async (clientName, serviceName, date, time) => {
    const messageBody = `Novo Agendamento! 🔔\n\nCliente: ${clientName}\nServiço: ${serviceName}\nData: ${date}\nHorário: ${time}`;

    try {
      // Usamos a nossa API da Vercel para enviar a mensagem
      const response = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: messageBody }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Notificação enviada para o admin!');
      } else {
        throw new Error(data.error || 'Falha ao enviar notificação.');
      }
    } catch (error) {
      console.error('Erro na notificação para admin:', error);
      toast.error(`Agendamento salvo, mas falha ao notificar o admin: ${error.message}`);
    }
  };

  const getSelectedClientName = () => {
    if (clientMode === 'select' && selectedUserId) {
      return clientOptions.find(c => c.value === selectedUserId)?.label || '';
    }
    if (clientMode === 'add') {
      return newClientName;
    }
    return '';
  };

  const isClientStepComplete = (clientMode === 'select' && selectedUserId) || (clientMode === 'add' && newClientName.trim() !== '');

  // ==================================================================
  // FIM DA ÁREA CORRIGIDA
  // ==================================================================

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
          <div className="step">
            <h3>2. Selecione ou Cadastre o Cliente</h3>
            <div className="client-mode-selector">
              <button onClick={() => setClientMode('select')} className={clientMode === 'select' ? 'selected' : ''}>Cliente Existente</button>
              <button onClick={() => setClientMode('add')} className={clientMode === 'add' ? 'selected' : ''}>Novo Cliente</button>
            </div>

            {clientMode === 'select' ? (
              <Select
                options={clientOptions}
                onChange={(selectedOption) => setSelectedUserId(selectedOption ? selectedOption.value : null)}
                value={clientOptions.find(c => c.value === selectedUserId)}
                placeholder="Digite para pesquisar ou selecione um cliente..."
                styles={customSelectStyles}
                noOptionsMessage={() => "Nenhum cliente encontrado"}
                isClearable
              />
            ) : (
              <div className="new-client-form">
                <input type="text" placeholder="Nome do novo cliente" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} />
                <input type="email" placeholder="Email (opcional)" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} />
              </div>
            )}
          </div>
        )}

        {selectedService && isClientStepComplete && (
          <>
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

            {selectedTime && (
              <div className="step">
                <h3>4. Confirmar Agendamento</h3>
                <div className="confirmation-summary">
                  <p><strong>Cliente:</strong> {getSelectedClientName()}</p>
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