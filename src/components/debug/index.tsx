import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PaymentChannelDebug from './PaymentChannelDebug';

const DebugRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/payment-channels" element={<PaymentChannelDebug />} />
    </Routes>
  );
};

export default DebugRoutes;
