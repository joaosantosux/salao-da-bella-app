import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, orderBy, doc, deleteDoc } from 'firebase/firestore';
import Calendar from 'react-calendar';
import toast from 'react-hot-toast'; // Garante que o toast está importado
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
      if (viewMode === 'date') {
        const formattedDate = selectedDate.toLocaleDateString('pt-BR');
        q = query(collection(db, "agendamentos"), where("date", "==", formattedDate), orderBy("time"));
      } else {
        q = query(collection(db, "agendamentos"), orderBy("date", "asc"), orderBy("time"));
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

  // ==========================================================
  // AQUI ESTÁ A MUDANÇA: Usando o toast de confirmação
  // ==========================================================
  const handleCancelBooking = (bookingId) => {
    toast((t) => (
      <div className="confirmation-toast">
        <h4>Cancelar Agendamento?</h4>
        <p>Esta ação não pode ser desfeita.</p>
        <div className="toast-buttons">
          <button
            className="confirm-button-toast"
            onClick={async () => {
              toast.dismiss(t.id); // Fecha o toast
              try {
                await deleteDoc(doc(db, "agendamentos", bookingId));
                toast.success('Agendamento cancelado!');
                fetchBookings(); // Atualiza a lista de agendamentos na tela
              } catch (error) {
                toast.error('Erro ao cancelar o agendamento.');
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
  // ==========================================================
  // FIM DA MUDANÇA
  // ==========================================================

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
                  <button className="admin-cancel-button" onClick={() => handleCancelBooking(booking.id)}>Cancelar</button>
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
                <button className="admin-cancel-button" onClick={() => handleCancelBooking(booking.id)}>Cancelar</button>
              </div>
            ))
          ) : <p>Nenhum agendamento futuro encontrado.</p>}
        </div>
      )}
    </>
  );
}

export default AdminDashboard;