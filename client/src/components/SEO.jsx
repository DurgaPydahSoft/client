import { Helmet } from 'react-helmet-async';

const defaultTitle = 'Pydah Hostel Management System | Digital Hostel Portal';
const defaultDescription = 'Pydah Hostel\'s comprehensive digital management system for hostel operations, student services, complaints, attendance, and fee management. A modern hostel portal by Pydah Soft.';
const defaultKeywords = 'Pydah Hostel, Pydah College Hostel, Hostel Management System, Digital Hostel Portal, Student Hostel Services, Hostel Complaints, Hostel Attendance, Hostel Fee Management, Pydah Soft, Hostel Operations, Student Portal, Hostel Digital Platform';
const defaultAuthor = 'Pydah Educational Institutions';
const defaultGenerator = 'Pydah Soft';

const SEO = ({ 
  title, 
  description, 
  keywords, 
  ogImage = 'https://hms.pydahsoft.in/og-image.jpg',
  ogType = 'website',
  canonicalUrl = 'https://hms.pydahsoft.in',
  structuredData = null
}) => {
  const seoTitle = title ? `${title} | Pydah Hostel` : defaultTitle;
  const seoDescription = description || defaultDescription;
  const seoKeywords = keywords || defaultKeywords;

  // Default structured data for the organization
  const defaultStructuredData = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": "Pydah Hostel",
    "alternateName": "Pydah College Hostel",
    "description": "Digital hostel management system for Pydah Educational Institutions",
    "url": "https://hms.pydahsoft.in",
    "logo": "https://hms.pydahsoft.in/PYDAH_LOGO_PHOTO.jpg",
    "sameAs": [
      "https://pydah.edu",
      "https://pydahsoft.com"
    ],
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "IN",
      "addressRegion": "Andhra Pradesh"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "availableLanguage": ["English", "Telugu"]
    },
    "serviceType": "Hostel Management System",
    "areaServed": "Andhra Pradesh, India"
  };

  const finalStructuredData = structuredData || defaultStructuredData;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{seoTitle}</title>
      <meta name="title" content={seoTitle} />
      <meta name="description" content={seoDescription} />
      <meta name="keywords" content={seoKeywords} />
      <meta name="author" content={defaultAuthor} />
      <meta name="generator" content={defaultGenerator} />
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />
      
      {/* Language and Region */}
      <meta name="language" content="English" />
      <meta name="geo.region" content="IN-AP" />
      <meta name="geo.placename" content="Andhra Pradesh" />
      <meta name="geo.position" content="17.3850;78.4867" />
      <meta name="ICBM" content="17.3850, 78.4867" />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Pydah Hostel" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={canonicalUrl} />
      <meta property="twitter:title" content={seoTitle} />
      <meta property="twitter:description" content={seoDescription} />
      <meta property="twitter:image" content={ogImage} />
      <meta property="twitter:site" content="@pydahsoft" />

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Additional SEO Meta Tags */}
      <meta name="application-name" content="Pydah Hostel" />
      <meta name="apple-mobile-web-app-title" content="Pydah Hostel" />
      <meta name="theme-color" content="#1e40af" />
      <meta name="msapplication-TileColor" content="#1e40af" />
      
      {/* Mobile Optimization */}
      <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
      <meta name="format-detection" content="telephone=no" />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(finalStructuredData)}
      </script>
      
      {/* Additional Structured Data for Web Application */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "Pydah Hostel Management System",
          "description": "Digital hostel management portal for students and administrators",
          "url": "https://hms.pydahsoft.in",
          "applicationCategory": "EducationalApplication",
          "operatingSystem": "Web Browser",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "INR"
          },
          "provider": {
            "@type": "Organization",
            "name": "Pydah Soft",
            "url": "https://pydahsoft.com"
          }
        })}
      </script>
    </Helmet>
  );
};

export default SEO; 