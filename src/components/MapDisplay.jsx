import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

function MapDisplay() {
  // Posição inicial do mapa (centro do Brasil)
  const position = [-14.235, -51.9253]; 

  return (
    <MapContainer center={position} zoom={4} style={{ height: '400px', width: '100%', borderRadius: '8px' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* Exemplo de um marcador */}
      <Marker position={[-23.5505, -46.6333]}>
        <Popup>
          Operação em São Paulo.
        </Popup>
      </Marker>
    </MapContainer>
  );
}

export default MapDisplay;