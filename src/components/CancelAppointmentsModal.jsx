import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import styled from 'styled-components';
import toast from 'react-hot-toast';

const ModalHeader = styled.h2`
  margin-top: 0;
  color: #333;
`;
const AppointmentList = styled.ul`
  list-style-type: none;
  padding: 0;
  padding-right: 10px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 5px;
`;
const AppointmentItem = styled.li`
  background-color: #f9f9f9;
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 15px;
  input {
    width: 20px;
    height: 20px;
  }
`;
const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 20px;
`;
const Button = styled.button`
  padding: 10px 20px;
  border-radius: 5px;
  border: none;
  cursor: pointer;
  font-weight: bold;
`;
const ConfirmButton = styled(Button)`
  background-color: #d9534f;
  color: white;
`;
const CancelButton = styled(Button)`
  background-color: #ccc;
`;

Modal.setAppElement('#root');

// Adicionamos a prop 'showCheckboxes' com valor padrão 'true'
export function CancelAppointmentsModal({ isOpen, onClose, user, appointments, onConfirm, title, message, showCheckboxes = true }) {
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds([]);
    }
  }, [isOpen]);

  const handleCheckboxChange = (bookingId) => {
    setSelectedIds(prev =>
      prev.includes(bookingId)
        ? prev.filter(id => id !== bookingId)
        : [...prev, bookingId]
    );
  };

  const handleConfirm = () => {
    if (showCheckboxes && selectedIds.length === 0) {
      return toast.error("Selecione pelo menos um agendamento para cancelar.");
    }
    onConfirm(showCheckboxes ? selectedIds : true);
    onClose();
  };

  const clientName = user?.name || (appointments.length > 0 ? appointments[0].userName : '');

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      style={{
        content: { top: '50%', left: '50%', right: 'auto', bottom: 'auto', marginRight: '-50%', transform: 'translate(-50%, -50%)', width: '90%', maxWidth: '500px' }
      }}
    >
      <ModalHeader>{title || `Cancelar Agendamentos de ${clientName}`}</ModalHeader>
      <p>{message || "Selecione os serviços que deseja cancelar."}</p>
      <AppointmentList>
        {appointments.map(app => (
          <AppointmentItem key={app.id}>
            {showCheckboxes && (
              <input
                type="checkbox"
                id={app.id}
                checked={selectedIds.includes(app.id)}
                onChange={() => handleCheckboxChange(app.id)}
              />
            )}
            <label htmlFor={app.id}>
              <strong>{app.serviceName}</strong> ({app.date} às {app.time})
              {!showCheckboxes && <strong> - {app.userName}</strong>}
            </label>
          </AppointmentItem>
        ))}
      </AppointmentList>
      <ModalFooter>
        <CancelButton onClick={onClose}>Fechar</CancelButton>
        <ConfirmButton onClick={handleConfirm}>Confirmar e Cancelar</ConfirmButton>
      </ModalFooter>
    </Modal>
  );
}