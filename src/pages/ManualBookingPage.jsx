import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebaseConfig.js';
import { collection, getDocs, doc, addDoc, updateDoc, serverTimestamp, query, where } from 'firebase/firestore';
import Calendar from 'react-calendar';
import toast from 'react-hot-toast';
import { useAvailability } from '../hooks/useAvailability';
// --- PASSO 2: Importando o novo componente ---
import Select from 'react-select';
import './ManualBookingPage.css';

// --- PASSO 3: Estilos customizados para o novo componente de busca ---
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
  const [selectedUserId, setSelectedUserId] = useState('');
  const [clientMode, setClientMode] = useState('select');
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');

  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [date, setDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(null);
  const { availableSlots, loading: availabilityLoading } = useAvailability(date);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const servicesCollectionRef = collection(db, 'servicos');
        const servicesData = await getDocs(servicesCollectionRef);
        setServices(servicesData.docs.map(doc => ({ ...doc.data(), id: doc.id })));

        const clientsQuery = query(collection(db, "users"), where("role", "==", "customer"));
        const clientsData = await getDocs(clientsQuery);
        const clientsList = clientsData.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        // 1. Ordena a lista de clientes por nome
        clientsList.sort((a, b) => a.name.localeCompare(b.name));

        // 2. Formata a lista para o padrão { value, label } que o react-select exige
        const clientOptions = clientsList.map(client => ({
          value: client.id,
          label: client.name
        }));

        setAllClients(clientOptions);
        // --- FIM DA CORREÇÃO ---

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

  const handleSaveBooking = async () => {
    if (!selectedService || !date || !selectedTime) {
      return toast.error("Preencha todos os campos: Serviço, Data e Horário.");
    }
    if (!currentUser) {
      return toast.error("Erro: Administrador não identificado. Tente fazer login novamente.");
    }

    let clientIdToUse = selectedUserId;
    // --- AQUI ESTÁ A CORREÇÃO ---
    // Buscamos o cliente na lista 'allClients' usando 'value' e pegamos o 'label' para o nome.

    let clientNameToUse = allClients.find(c => c.value === selectedUserId)?.label;

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
      await addDoc(collection(db, "agendamentos"), {
        userId: clientIdToUse,
        userName: clientNameToUse,
        adminId: currentUser.uid,
        serviceId: selectedService.id,git add .
        serviceName: selectedService.name,
        servicePrice: selectedService.price,
        date: date.toLocaleDateString('pt-BR'),
        time: selectedTime,
        status: 'Agendado',
      });

      const userDocRef = doc(db, 'users', clientIdToUse);
      await updateDoc(userDocRef, { status: 'agendado' });

      toast.success("Agendamento manual criado e status do cliente atualizado!");
      // --- INÍCIO DA ADIÇÃO ---
      // Encontra o nome do serviço selecionado para usar na mensagem
      const serviceName = services.find(s => s.id === selectedService)?.name || 'serviço selecionado';

      // Chama a função de notificação após salvar tudo
      await sendWhatsAppNotification(selectedCustomer, serviceName, selectedDate.toLocaleDateString('pt-BR'), selectedTime);
      // --- FIM DA ADIÇÃO ---

      // Reset form
      setSelectedCustomer(null);
      // ... resto da função de reset
      // --- INÍCIO DA NOVA LÓGICA DE "RESET" ---
      // Limpa todos os estados para recomeçar o formulário
      setSelectedService(null);
      setSelectedUserId(null);
      setClientMode('select');
      setNewClientName('');
      setNewClientEmail('');
      setDate(new Date()); // Opcional: reseta a data para hoje
      setSelectedTime(null);
      // A linha 'navigate' foi removida.
    } catch (error) {
      toast.error("Erro ao criar agendamento.");
      console.error("Erro no agendamento manual:", error);
    }
  };

  const getSelectedClientName = () => {
    if (clientMode === 'select' && selectedUserId) {
      return allClients.find(c => c.value === selectedUserId)?.label || '';
    }
    if (clientMode === 'add') {
      return newClientName;
    }
    return '';
  };

  // --- INÍCIO DA CORREÇÃO ---
  // Criamos uma variável para verificar se a etapa do cliente está concluída.
  const isClientStepComplete = (clientMode === 'select' && selectedUserId) || (clientMode === 'add' && newClientName.trim() !== '');
  // --- FIM DA CORREÇÃO ---
  const sendWhatsAppNotification = async (customer, serviceName, date, time) => {
    // Formata o número para o padrão E.164 que a Twilio exige (ex: +5542999998888)
    // Isso remove espaços, traços, parênteses e garante que comece com o código do país.
    const formatedPhoneNumber = `+${customer.phone.replace(/\D/g, '')}`;

    const messageBody = `Olá, ${customer.name}! Seu agendamento para o serviço de "${serviceName}" no dia ${date} às ${time} foi confirmado com sucesso. Te esperamos! - Salão da Bella`;

    try {
      const response = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: formatedPhoneNumber, // Número do cliente formatado
          body: messageBody,       // A mensagem que escrevemos
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Notificação de WhatsApp enviada com sucesso!');
      } else {
        throw new Error(data.error || 'Falha ao enviar notificação.');
      }
    } catch (error) {
      console.error('Erro na notificação via WhatsApp:', error);
      toast.error(`Agendamento salvo, mas falha ao notificar: ${error.message}`);
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
          <div className="step">
            <h3>2. Selecione ou Cadastre o Cliente</h3>
            <div className="client-mode-selector">
              <button onClick={() => setClientMode('select')} className={clientMode === 'select' ? 'selected' : ''}>Cliente Existente</button>
              <button onClick={() => setClientMode('add')} className={clientMode === 'add' ? 'selected' : ''}>Novo Cliente</button>
            </div>

            {clientMode === 'select' ? (
              // --- PASSO 3: Substituindo o <select> pelo <Select> de busca ---

              <Select
                options={allClients}
                onChange={(selectedOption) => setSelectedUserId(selectedOption.value)}
                placeholder="Digite para pesquisar ou selecione um cliente..."
                styles={customSelectStyles}
                noOptionsMessage={() => "Nenhum cliente encontrado"}
              />
            ) : (
              <div className="new-client-form">
                <input type="text" placeholder="Nome do novo cliente" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} />
                <input type="email" placeholder="Email (opcional)" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} />
              </div>
            )}
          </div>
        )}

        {/* --- A CONDIÇÃO AQUI FOI SIMPLIFICADA --- */}
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