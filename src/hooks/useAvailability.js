import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export function useAvailability(date) {
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getAvailability = async () => {
      if (!date) return;
      setLoading(true);

      try {
        // ... (toda a sua lógica para buscar configurações e exceções permanece a mesma)
        const settingsRef = doc(db, 'settings', 'availability');
        const settingsSnap = await getDoc(settingsRef);
        if (!settingsSnap.exists()) {
          setLoading(false);
          return;
        }
        const defaultSettings = settingsSnap.data();

        const dateString = date.toISOString().split('T')[0];
        const overrideRef = doc(db, 'availabilityOverrides', dateString);
        const overrideSnap = await getDoc(overrideRef);

        let potentialSlots;

        if (overrideSnap.exists()) {
          potentialSlots = overrideSnap.data().timeSlots;
        } else {
          const dayOfWeek = (date.getDay() + 6) % 7; // Ajusta para Segunda = 0 ... Domingo = 6
          if (!defaultSettings.workingDays.includes(date.getDay())) {
            setAvailableSlots([]);
            setLoading(false);
            return;
          }
          potentialSlots = defaultSettings.defaultTimeSlots;
        }

        const today = new Date();
        if (date.toDateString() === today.toDateString()) {
          const currentTime = today.getHours().toString().padStart(2, '0') + ':' + today.getMinutes().toString().padStart(2, '0');
          potentialSlots = potentialSlots.filter(slot => slot > currentTime);
        }

        const formattedDate = date.toLocaleDateString('pt-BR');

        // --- AQUI ESTÁ A CORREÇÃO ---
        // Adicionamos a condição para buscar apenas agendamentos com status "Agendado"
        const bookingsQuery = query(
          collection(db, 'agendamentos'),
          where('date', '==', formattedDate),
          where('status', '==', 'Agendado') // <-- A LINHA MÁGICA
        );
        // --- FIM DA CORREÇÃO ---

        const bookingsSnap = await getDocs(bookingsQuery);
        const bookedTimes = bookingsSnap.docs.map(d => d.data().time);

        const finalSlots = potentialSlots.filter(slot => !bookedTimes.includes(slot));
        setAvailableSlots(finalSlots);

      } catch (error) {
        console.error("Erro ao calcular disponibilidade:", error);
        setAvailableSlots([]);
      } finally {
        setLoading(false);
      }
    };

    getAvailability();
  }, [date]);

  return { availableSlots, loading };
}