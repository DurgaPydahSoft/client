import React from 'react';
import SEO from '../../components/SEO';
import CategoryChangesPanel from '../../components/CategoryChangesPanel';

const CategoryChangeRequests = () => {
  return (
    <>
      <SEO title="Category Changes - Warden" />
      <CategoryChangesPanel mode="warden" />
    </>
  );
};

export default CategoryChangeRequests;
