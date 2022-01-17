import React from 'react';
import { BULL_QUEUES_ROUTE } from '../../config/constants';

const Dashboard = () => {
  return <iframe style={{ flex: 1 }} src={BULL_QUEUES_ROUTE} />;
};

export default Dashboard;
