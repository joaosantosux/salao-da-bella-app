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
          if (!defaultSettings.workingDays.includes(date.getDay())) {
            setAvailableSlots([]);
            setLoading(false);
            return;
          }
          potentialSlots = defaultSettings.defaultTimeSlots;
        }

        const today = new Date();

        // ==========================================================
        // AQUI ESTÁ A CORREÇÃO
        // Em vez de comparar com setHours, comparamos a data como texto, que é mais seguro.
        if (date.toDateString() === today.toDateString()) {
        // ==========================================================
          const currentTime = today.getHours().toString().padStart(2, '0') + ':' + today.getMinutes().toString().padStart(2, '0');
          potentialSlots = potentialSlots.filter(slot => slot > currentTime);
        }

        const formattedDate = date.toLocaleDateString('pt-BR');
        const bookingsQuery = query(collection(db, 'agendamentos'), where('date', '==', formattedDate));
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