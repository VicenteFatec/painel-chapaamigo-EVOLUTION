import React from 'react';
import './Modal.css'; // Vamos criar este CSS a seguir
import { X } from 'lucide-react';

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) {
    return null; // Se não estiver aberto, não renderiza nada
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button onClick={onClose} className="modal-close-button">
            <X size={24} />
          </button>
        </div>
        <div className="modal-body">
          {children} {/* Aqui entrará o conteúdo do nosso formulário */}
        </div>
      </div>
    </div>
  );
}

export default Modal;