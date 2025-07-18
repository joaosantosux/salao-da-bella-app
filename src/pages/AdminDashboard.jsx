import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig.js';
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore';
import Calendar from 'react-calendar';
import toast from 'react-hot-toast';
import 'react-calendar/dist/Calendar.css';
import './AdminDashboard.css';

function AdminDashboard() {
  const [viewMode, setViewMode] = useState('date');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    setBookings([]);
    try {
      let q;
      const bookingsCollection = collection(db, "agendamentos");
      const activeStatus = "Agendado";

      if (viewMode === 'date') {
        const formattedDate = selectedDate.toLocaleDateString('pt-BR');
        q = query(bookingsCollection, where("date", "==", formattedDate), where("status", "==", activeStatus), orderBy("time"));
      } else {
        q = query(bookingsCollection, where("status", "==", activeStatus), orderBy("date", "asc"), orderBy("time"));
      }
      const querySnapshot = await getDocs(q);
      const fetchedBookings = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(fetchedBookings);
    } catch (error) {
      console.error("Erro ao buscar agendamentos:", error);
      toast.error("Erro ao buscar agendamentos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [selectedDate, viewMode]);

  const handleCancelBooking = (bookingToCancel) => {
    const { id: bookingId, userId } = bookingToCancel;
    
    if (!userId) {
      toast.error(
        "Agendamento antigo. O Kanban não será atualizado pois não há um cliente vinculado.", 
        { duration: 5000 }
      );
      const bookingRef = doc(db, "agendamentos", bookingId);
      updateDoc(bookingRef, { status: "Cancelado" }).then(() => {
        fetchBookings();
      });
      return;
    }

    toast((t) => (
      <div className="confirmation-toast">
        <h4>Cancelar Agendamento?</h4>
        <p>Esta ação irá atualizar o status do cliente no Kanban.</p>
        <div className="toast-buttons">
          <button
            className="confirm-button-toast"
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                const bookingRef = doc(db, "agendamentos", bookingId);
                await updateDoc(bookingRef, { status: "Cancelado" });

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const otherBookingsQuery = query(
                  collection(db, "agendamentos"),
                  where("userId", "==", userId),
                  where("status", "==", "Agendado")
                );
                const snapshot = await getDocs(otherBookingsQuery);
                const futureBookings = snapshot.docs.filter(d => {
                    const appDate = new Date(d.data().date.split('/').reverse().join('-'));
                    return appDate >= today;
                });

                if (futureBookings.length === 0) {
                  const userRef = doc(db, "users", userId);
                  await updateDoc(userRef, { status: "desistente" });
                  toast.success('Agendamento cancelado e status do cliente atualizado!');
                } else {
                  toast.success('Agendamento cancelado!');
                }
                
                fetchBookings();
              } catch (error) {
                toast.error('Erro ao cancelar o agendamento.');
                console.error("Erro ao cancelar: ", error);
              }
            }}
          >
            Sim, cancelar
          </button>
          <button className="cancel-button-toast" onClick={() => toast.dismiss(t.id)}>
            Não
          </button>
        </div>
      </div>
    ));
  };

  return (
    <>
      <div className="view-mode-selector">
        <button onClick={() => setViewMode('date')} className={viewMode === 'date' ? 'active' : ''}>Ver por Data</button>
        <button onClick={() => setViewMode('all')} className={viewMode === 'all' ? 'active' : ''}>Todos Agendamentos</button>
      </div>

      {viewMode === 'date' ? (
        <div className="admin-content">
          <div className="calendar-container">
            <p>Selecione uma data para ver os agendamentos do dia.</p>
            <Calendar onChange={setSelectedDate} value={selectedDate} />
          </div>
          <div className="bookings-list-container">
            <h3>Agendamentos para {selectedDate.toLocaleDateString('pt-BR')}</h3>
            {loading ? <p>Carregando...</p> : bookings.length > 0 ? (
              bookings.map(booking => (
                <div key={booking.id} className="admin-booking-card">
                  <div className="booking-details-admin">
                    <strong>{booking.time}</strong> - {booking.serviceName} <span>({booking.userName})</span>
                  </div>
                  <button className="admin-cancel-button" onClick={() => handleCancelBooking(booking)}>Cancelar</button>
                </div>
              ))
            ) : <p>Nenhum agendamento para esta data.</p>}
          </div>
        </div>
      ) : (
        <div className="all-bookings-container">
          <h3>Todos os Próximos Agendamentos</h3>
          {loading ? <p>Carregando...</p> : bookings.length > 0 ? (
            bookings.map(booking => (
              <div key={booking.id} className="admin-booking-card-full">
                <div className="booking-date-highlight">{booking.date}</div>
                <div className="booking-details">
                  <strong>{booking.time}</strong> - {booking.serviceName} <span>({booking.userName})</span>
                </div>
                <button className="admin-cancel-button" onClick={() => handleCancelBooking(booking)}>Cancelar</button>
              </div>
            ))
          ) : <p>Nenhum agendamento futuro encontrado.</p>}
        </div>
      )}
    </>
  );
}

// --- AQUI ESTÁ A CORREÇÃO ---
// Trocamos 'export { AdminDashboard };' por 'export default AdminDashboard;'
export default AdminDashboard;