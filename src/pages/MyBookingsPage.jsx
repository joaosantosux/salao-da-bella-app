import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
// Adicionamos 'updateDoc' para a nova lógica
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import './MyBookingsPage.css';

function MyBookingsPage({ currentUser }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // --- AJUSTE NA BUSCA ---
      // Agora, buscamos apenas agendamentos que estão ativamente 'Agendado'
      const q = query(
        collection(db, "agendamentos"),
        where("userId", "==", currentUser.uid),
        where("status", "==", "Agendado") // Garante que cancelados não apareçam
      );
      const querySnapshot = await getDocs(q);
      const userBookings = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Ordena os agendamentos pela data mais próxima primeiro
      userBookings.sort((a, b) => {
        const dateA = new Date(a.date.split('/').reverse().join('-'));
        const dateB = new Date(b.date.split('/').reverse().join('-'));
        return dateA - dateB;
      });

      setBookings(userBookings);
    } catch (error) {
      console.error("Erro ao buscar agendamentos:", error);
      toast.error("Não foi possível carregar seus agendamentos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [currentUser]);

  // --- LÓGICA DE CANCELAMENTO REFEITA ---
  const handleCancelBooking = (bookingId) => {
    toast((t) => (
      <div className="confirmation-toast">
        <h4>Tem certeza?</h4>
        <p>Você realmente deseja cancelar este agendamento?</p>
        <div className="toast-buttons">
          <button
            className="confirm-button-toast"
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                // Passo 1: Atualiza o status do agendamento para 'Cancelado'
                const bookingRef = doc(db, "agendamentos", bookingId);
                await updateDoc(bookingRef, { status: "Cancelado" });

                // Passo 2: Verifica se existem OUTROS agendamentos futuros
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const otherBookingsQuery = query(
                  collection(db, "agendamentos"),
                  where("userId", "==", currentUser.uid),
                  where("status", "==", "Agendado")
                );
                const snapshot = await getDocs(otherBookingsQuery);
                const futureBookings = snapshot.docs.filter(d => {
                  const appDate = new Date(d.data().date.split('/').reverse().join('-'));
                  return appDate >= today;
                });

                // Passo 3: Se não houver mais agendamentos futuros, atualiza o status do USUÁRIO
                if (futureBookings.length === 0) {
                  const userRef = doc(db, "users", currentUser.uid);
                  await updateDoc(userRef, { status: "desistente" });
                  toast.success('Agendamento cancelado! Seu status foi atualizado.');
                } else {
                  toast.success('Agendamento cancelado!');
                }

                // Atualiza a lista de agendamentos na tela
                fetchBookings();
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
    ), { duration: 6000 });
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
        <p>Você ainda não tem nenhum agendamento ativo.</p>
      )}
    </div>
  );
}

// Lembre-se de ajustar a importação no App.jsx se você mudou para exportação nomeada
// Se o arquivo já usa 'export default', pode manter.
export default MyBookingsPage;