import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import './ServiceManagement.css';

function ServiceManagement() {
  const [services, setServices] = useState([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [updatedName, setUpdatedName] = useState('');
  const [updatedPrice, setUpdatedPrice] = useState('');

  const servicesCollectionRef = collection(db, 'servicos');

  const fetchServices = async () => {
    const data = await getDocs(servicesCollectionRef);
    setServices(data.docs.map(doc => ({ ...doc.data(), id: doc.id })));
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const formatPrice = (priceInput) => {
    const numericString = priceInput.toString().replace(',', '.');
    const priceNumber = parseFloat(numericString);
    if (isNaN(priceNumber)) {
      return null;
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(priceNumber);
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    if (newServiceName.trim() === '' || newServicePrice.trim() === '') {
      return toast.error('Por favor, preencha todos os campos.');
    }

    const formattedPrice = formatPrice(newServicePrice);
    if (formattedPrice === null) {
      return toast.error('Por favor, insira um valor de preço válido.');
    }

    try {
      await addDoc(servicesCollectionRef, { name: newServiceName, price: formattedPrice });
      setNewServiceName('');
      setNewServicePrice('');
      fetchServices();
      toast.success('Serviço adicionado com sucesso!');
    } catch (error) {
      toast.error('Erro ao adicionar serviço.');
      console.error(error);
    }
  };

  const handleDeleteService = (serviceId) => {
    toast((t) => (
      <div className="confirmation-toast">
        <h4>Excluir Serviço?</h4>
        <p>Esta ação não pode ser desfeita.</p>
        <div className="toast-buttons">
          <button className="confirm-button-toast" onClick={async () => {
            toast.dismiss(t.id);
            try {
              await deleteDoc(doc(db, "servicos", serviceId));
              fetchServices();
              toast.success("Serviço excluído!");
            } catch (error) {
              toast.error("Erro ao excluir serviço.");
            }
          }}>
            Sim, excluir
          </button>
          <button className="cancel-button-toast" onClick={() => toast.dismiss(t.id)}>
            Não
          </button>
        </div>
      </div>
    ));
  };

  const handleUpdateService = async (serviceId) => {
    const formattedPrice = formatPrice(updatedPrice);
    if (formattedPrice === null) {
      return toast.error('Por favor, insira um valor de preço válido.');
    }

    try {
      const serviceDoc = doc(db, "servicos", serviceId);
      await updateDoc(serviceDoc, { name: updatedName, price: formattedPrice });
      setEditingServiceId(null);
      fetchServices();
      toast.success("Serviço atualizado!");
    } catch (error) {
      toast.error("Erro ao atualizar serviço.");
    }
  };

  const startEditing = (service) => {
    setEditingServiceId(service.id);
    setUpdatedName(service.name);
    // Remove a formatação para editar o número puro
    const priceString = service.price.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
    setUpdatedPrice(priceString);
  };

  return (
    <div className="service-management-container">
      <h2>Gerenciar Serviços</h2>
      <form onSubmit={handleAddService} className="add-service-form">
        <h3>Adicionar Novo Serviço</h3>
        <input type="text" placeholder="Nome do Serviço" value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} />
        <input type="text" inputMode="decimal" placeholder="Preço (ex: 100 ou 100,50)" value={newServicePrice} onChange={(e) => setNewServicePrice(e.target.value)} />
        <button type="submit">Adicionar Serviço</button>
      </form>
      <div className="service-list-admin">
        <h3>Serviços Atuais</h3>
        {services.map(service => (
          <div key={service.id} className="service-item-admin">
            {editingServiceId === service.id ? (
              <div className="edit-mode">
                <input type="text" value={updatedName} onChange={(e) => setUpdatedName(e.target.value)} />
                <input type="text" inputMode="decimal" value={updatedPrice} onChange={(e) => setUpdatedPrice(e.target.value)} />
                <div className="edit-actions">
                  <button onClick={() => handleUpdateService(service.id)} className="save-button">Salvar</button>
                  <button onClick={() => setEditingServiceId(null)} className="cancel-edit-button">Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <div className="service-info">
                  <span>{service.name}</span>
                  <span>{service.price}</span>
                </div>
                <div className="service-actions">
                  <button type="button" onClick={() => startEditing(service)} className="edit-button">Editar</button>
                  <button type="button" onClick={() => handleDeleteService(service.id)} className="delete-button">Excluir</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
export default ServiceManagement;