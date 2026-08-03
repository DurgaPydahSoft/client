import React from 'react';
import SEO from '../../components/SEO';
import RoomChangesPanel from '../../components/RoomChangesPanel';

const RoomChangeRequests = () => {
  return (
    <div>
      <SEO title="Room Changes" />
      <RoomChangesPanel mode="warden" />
    </div>
  );
};

export default RoomChangeRequests;
