import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebaseConfig';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import Calendar from 'react-calendar';
import toast from 'react-hot-toast';
import { useAvailability } from '../hooks/useAvailability';
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
      // Passo 1: Salva o agendamento no Firestore (isso já estava funcionando)
      await addDoc(collection(db, "agendamentos"), {
        userId: currentUser.uid,
        userName: currentUser.name,
        serviceId: serviceId,
        serviceName: service.name,
        servicePrice: service.price,
        date: date.toLocaleDateString('pt-BR'),
        time: selectedTime,
      });

      // ==========================================================
      // INÍCIO DO CÓDIGO RESTAURADO
      // ==========================================================
      // Passo 2: Tenta enviar a notificação para a API na Vercel
      try {
        const notificationData = {
          userName: currentUser.name,
          serviceName: service.name,
          date: date.toLocaleDateString('pt-BR'),
          time: selectedTime,
        };

        // !!!!!!!!!!   LEMBRE-SE DE COLOCAR SUA URL DA VERCEL AQUI   !!!!!!!!!!
        await fetch('https://telegram-bot-salao.vercel.app/api/sendMessage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notificationData),
        });
      } catch (notificationError) {
        // Este console.error é para nós, desenvolvedores. O usuário não precisa saber da falha na notificação.
        console.error("Aviso: Agendamento salvo, mas notificação falhou:", notificationError);
      }
      // ==========================================================
      // FIM DO CÓDIGO RESTAURADO
      // ==========================================================

      toast.success("Agendamento realizado com sucesso!");
      navigate('/');

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
      <Calendar onChange={setDate} value={date} minDate={new Date()} tileDisabled={({ date }) => !useAvailability(date).availableSlots.length && date.getDay() !== 0} />
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