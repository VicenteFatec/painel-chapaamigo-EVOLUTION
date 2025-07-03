import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// PASSO 1: Importar os ícones como módulos, usando a sintaxe moderna (O jeito Vite)
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';


// --- INÍCIO DA CRIAÇÃO DOS ÍCONES CUSTOMIZADOS ---

// VERSÃO REFINADA (SEM BORDA)
const createColoredIcon = (color) => {
  const markerHtml = `
    <svg viewBox="0 0 24 24" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
            fill="${color}"/>
    </svg>`;
// ... resto da função ...

  return new L.DivIcon({
    html: markerHtml,
    className: 'leaflet-div-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

const icons = {
  pendente: createColoredIcon('#f97316'), // Laranja
  aguardando_resposta: createColoredIcon('#3b82f6'), // Azul
  confirmado: createColoredIcon('#22c55e'), // Verde
};

// --- FIM DA CRIAÇÃO DOS ÍCONES ---

// PASSO 2: Usar as variáveis importadas para corrigir o ícone padrão
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: iconRetinaUrl,
    iconUrl: iconUrl,
    shadowUrl: shadowUrl,
});


function MapDisplay({ solicitacoes = [] }) {
  const position = [-14.235, -51.9253]; 

  return (
    <div className="leaflet-container" style={{ height: '450px', width: '100%', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <MapContainer center={position} zoom={4} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {solicitacoes.map(os => {
          if (os.latitude && os.longitude && icons[os.status]) {
            return (
              <Marker 
                key={os.id} 
                position={[os.latitude, os.longitude]}
                icon={icons[os.status]}
              >
                <Popup>
                  <strong>Cliente:</strong> {os.cliente} <br />
                  <strong>Endereço:</strong> {os.endereco?.logradouro}, {os.endereco?.numero} <br />
                  <strong>Status:</strong> {os.status}
                </Popup>
              </Marker>
            );
          }
          return null; 
        })}
      </MapContainer>
    </div>
  );
}

export default MapDisplay;