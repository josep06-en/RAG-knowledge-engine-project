import React from 'react';

export const AppTest: React.FC = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#333', marginBottom: '20px' }}>
        RAG Knowledge Engine - Test
      </h1>
      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '20px', 
        borderRadius: '8px',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <h2 style={{ color: '#666', marginBottom: '15px' }}>
          Frontend is Working!
        </h2>
        <div style={{ spaceY: '10px', color: '#555' }}>
          <p>✅ React + Vite server running</p>
          <p>✅ Component rendering successfully</p>
          <p>✅ No 404 errors</p>
          <p>🌐 API should be available at: http://localhost:8000</p>
          <p>📚 Frontend running at: http://localhost:3000</p>
        </div>
      </div>
    </div>
  );
};
