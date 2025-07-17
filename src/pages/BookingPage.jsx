import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebaseConfig';
import { doc, getDoc, addDoc, collection, updateDoc } from 'firebase/firestore';
import Calendar from 'react-calendar';
import toast from 'react-hot-toast';
import { useAvailability } from '../hooks/useAvailability';
import '../components/Calendar.css';
import './BookingPage.css';

function BookingPage({ currentUser }) {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [date, setDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(null);
  const { availableSlots, loading: availabilityLoading } = useAvailability(date);

  useEffect(() => {
    const fetchServiceDetails = async () => {
      const serviceDocRef = doc(db, 'servicos', serviceId);
      const docSnap = await getDoc(serviceDocRef);
      if (docSnap.exists()) {
        setService(docSnap.data());
      }
    };
    fetchServiceDetails();
  }, [serviceId]);

  useEffect(() => {
    setSelectedTime(null);
  }, [date]);

  const handleBooking = async () => {
    if (!currentUser) return toast.error("Você precisa estar logado para agendar.");
    if (!service || !date || !selectedTime) return toast.error("Por favor, selecione data e horário.");

    try {
      await addDoc(collection(db, "agendamentos"), {
        userId: currentUser.uid,
        userName: currentUser.name,
        serviceId: serviceId,
        serviceName: service.name,
        servicePrice: service.price,
        date: date.toLocaleDateString('pt-BR'),
        time: selectedTime,
        status: 'Agendado',
      });

      // Atualiza o status do usuário na coleção 'users'
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, { status: 'agendado' });

      try {
        const notificationData = { userName: currentUser.name, serviceName: service.name, date: date.toLocaleDateString('pt-BR'), time: selectedTime };
        // Lembre-se de colocar sua URL correta da Vercel aqui
        await fetch('https://telegram-bot-salao.vercel.app/api/sendMessage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notificationData),
        });
      } catch (notificationError) {
        console.error("Aviso: Agendamento salvo, mas notificação falhou:", notificationError);
      }

      toast.success("Agendamento realizado com sucesso!");
      navigate('/meus-agendamentos');
    } catch (error) {
      console.error("ERRO DETALHADO AO SALVAR:", error);
      toast.error("Ocorreu um erro ao agendar. Tente novamente.");
    }
  };

  if (!service) { return <div>Carregando...</div>; }

  return (
    <div className="booking-container">
      <div className="service-details">
        <h3>{service.name}</h3>
        <p>{service.price}</p>
      </div>
      <h2>Selecione uma data</h2>
      <Calendar onChange={setDate} value={date} minDate={new Date()} />
      <div className="time-slots-container">
        <h2>Selecione um horário</h2>
        {availabilityLoading ? <p>Verificando...</p> : availableSlots.length > 0 ? (
          availableSlots.map(time => (
            <button key={time} onClick={() => setSelectedTime(time)} className={`time-slot-button ${selectedTime === time ? 'selected' : ''}`}>{time}</button>
          ))
        ) : <p>Nenhum horário disponível para esta data.</p>}
      </div>
      <div className="confirmation-area">
        {date && selectedTime && (
          <>
            <p>Agendamento: {date.toLocaleDateString('pt-BR')} às {selectedTime}</p>
            <button className="confirm-button" onClick={handleBooking}>Confirmar Agendamento</button>
          </>
        )}
      </div>
    </div>
  );
}
export default BookingPage;