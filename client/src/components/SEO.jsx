import { Helmet } from 'react-helmet-async';

const SEO = ({ 
  title, 
  description, 
  keywords, 
  ogImage = 'https://hostel.pydah.edu/og-image.jpg',
  ogType = 'website',
  canonicalUrl = 'https://hostel.pydah.edu'
}) => {
  const defaultTitle = 'Pydah Hostel Complaint Management System | Online Hostel Grievance Portal';
  const defaultDescription = 'Pydah Hostel\'s official complaint management system. Submit and track hostel-related complaints online. Quick resolution for maintenance, canteen, internet, and other hostel services.';
  const defaultKeywords = 'Pydah Hostel, Hostel Complaint, Hostel Grievance, Pydah College Hostel, Hostel Maintenance, Hostel Services, Online Complaint System, Student Grievance Portal';

  const seoTitle = title ? `${title} | Pydah Hostel` : defaultTitle;
  const seoDescription = description || defaultDescription;
  const seoKeywords = keywords || defaultKeywords;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{seoTitle}</title>
      <meta name="title" content={seoTitle} />
      <meta name="description" content={seoDescription} />
      <meta name="keywords" content={seoKeywords} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:image" content={ogImage} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={canonicalUrl} />
      <meta property="twitter:title" content={seoTitle} />
      <meta property="twitter:description" content={seoDescription} />
      <meta property="twitter:image" content={ogImage} />

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />
    </Helmet>
  );
};

export default SEO; 