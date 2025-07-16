import './ServiceList.css';
import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom'; // 1. IMPORTE O LINK

function ServiceList() {
  const [services, setServices] = useState([]);

  useEffect(() => {
    const fetchServices = async () => {
      const servicesCollection = collection(db, 'servicos');
      const serviceSnapshot = await getDocs(servicesCollection);
      const servicesData = serviceSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setServices(servicesData);
    };

    fetchServices();
  }, []);

  return (
    <div className="service-list-container">
      {services.map(service => (
        <div key={service.id} className="service-card">
          <h3>{service.name}</h3>
          <p>{service.price}</p>
          {/* 2. TROQUE O BOTÃO PELO LINK */}
          <Link to={`/agendar/${service.id}`} className="agendar-button">
            Agendar
          </Link>
        </div>
      ))}
    </div>
  );
}

export default ServiceList;