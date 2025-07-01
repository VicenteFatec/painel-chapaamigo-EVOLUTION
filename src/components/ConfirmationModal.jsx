import React from 'react';
import './ConfirmationModal.css'; // Vamos criar este CSS a seguir
import { AlertTriangle } from 'lucide-react';

function ConfirmationModal({ isOpen, onClose, onConfirm, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="confirm-modal-overlay">
      <div className="confirm-modal-content">
        <div className="confirm-modal-header">
          <AlertTriangle size={24} className="confirm-modal-icon" />
          <h2 className="confirm-modal-title">{title}</h2>
        </div>
        <div className="confirm-modal-body">
          {children}
        </div>
        <div className="confirm-modal-footer">
          <button onClick={onClose} className="confirm-modal-btn cancel-btn">
            Cancelar
          </button>
          <button onClick={onConfirm} className="confirm-modal-btn confirm-btn">
            Confirmar Exclusão
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;