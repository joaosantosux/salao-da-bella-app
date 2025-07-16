import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast'; // O toast já deve estar importado
import './MyBookingsPage.css';

function MyBookingsPage({ currentUser }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    if (!currentUser) return;
    const q = query(collection(db, "agendamentos"), where("userId", "==", currentUser.uid));
    const querySnapshot = await getDocs(q);
    const userBookings = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setBookings(userBookings);
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, [currentUser]);

  // AQUI ESTÁ A MUDANÇA
  const handleCancelBooking = (bookingId) => {
    toast((t) => (
      <div className="confirmation-toast">
        <h4>Tem certeza?</h4>
        <p>Você realmente deseja cancelar este agendamento?</p>
        <div className="toast-buttons">
          <button
            className="confirm-button-toast"
            onClick={async () => {
              toast.dismiss(t.id); // Fecha o toast de confirmação
              try {
                await deleteDoc(doc(db, "agendamentos", bookingId));
                toast.success('Agendamento cancelado!', { duration: 3000 })
                fetchBookings(); // Atualiza a lista de agendamentos na tela
              } catch (error) {
                toast.error('Erro ao cancelar o agendamento.');
                console.error("Erro ao cancelar: ", error);
              }
            }}
          >
            Sim, cancelar
          </button>
          <button
            className="cancel-button-toast"
            onClick={() => toast.dismiss(t.id)}
          >
            Não
          </button>
        </div>
      </div>
    ), {
      duration: 6000, // O toast fica na tela por mais tempo
    });
  };

  if (loading) {
    return <p>Carregando seus agendamentos...</p>;
  }

  return (
    <div className="my-bookings-container">
      <h2>Meus Agendamentos</h2>
      {bookings.length > 0 ? (
        bookings.map(booking => (
          <div key={booking.id} className="booking-card">
            <h3>{booking.serviceName}</h3>
            <p>Data: {booking.date}</p>
            <p>Horário: {booking.time}</p>
            <p>Preço: {booking.servicePrice}</p>
            <button
              className="cancel-booking-button"
              onClick={() => handleCancelBooking(booking.id)}
            >
              Cancelar Agendamento
            </button>
          </div>
        ))
      ) : (
        <p>Você ainda não tem nenhum agendamento.</p>
      )}
    </div>
  );
}

export default MyBookingsPage;