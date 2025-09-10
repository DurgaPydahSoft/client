import { Helmet } from 'react-helmet-async';
import { useGlobalSettings } from '../context/GlobalSettingsContext';

const SEO = ({ 
  title, 
  description, 
  keywords, 
  ogImage,
  ogType = 'website',
  canonicalUrl,
  structuredData = null
}) => {
  const { 
    getSEOTitle, 
    getSEODescription, 
    getSEOKeywords, 
    getWebsiteUrl, 
    getInstitutionName,
    getInstitutionFullName,
    getMainWebsiteUrl,
    getFormattedAddress,
    getContactInfo,
    getPydahSoftInfo,
    settings
  } = useGlobalSettings();

  const seoTitle = getSEOTitle(title);
  const seoDescription = getSEODescription(description);
  const seoKeywords = getSEOKeywords(keywords);
  const websiteUrl = canonicalUrl || getWebsiteUrl();
  const ogImageUrl = ogImage || settings?.seo?.ogImage || `${getWebsiteUrl()}/og-image.jpg`;

  // Default structured data for the organization
  const defaultStructuredData = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": getInstitutionName(),
    "alternateName": getInstitutionFullName(),
    "description": seoDescription,
    "url": websiteUrl,
    "logo": `${websiteUrl}/PYDAH_LOGO_PHOTO.jpg`,
    "sameAs": [
      getMainWebsiteUrl(),
      getPydahSoftInfo().website
    ],
    "address": {
      "@type": "PostalAddress",
      "streetAddress": settings?.institution?.address?.street || "Pydah Campus",
      "addressLocality": settings?.institution?.address?.city || "Visakhapatnam",
      "addressRegion": settings?.institution?.address?.state || "Andhra Pradesh",
      "postalCode": settings?.institution?.address?.pincode || "530040",
      "addressCountry": settings?.institution?.address?.country || "IN"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "telephone": getContactInfo().phone,
      "email": getContactInfo().email,
      "availableLanguage": ["English", "Telugu"]
    },
    "serviceType": "Hostel Management System",
    "areaServed": settings?.institution?.address?.state || "Andhra Pradesh, India"
  };

  const finalStructuredData = structuredData || defaultStructuredData;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{seoTitle}</title>
      <meta name="title" content={seoTitle} />
      <meta name="description" content={seoDescription} />
      <meta name="keywords" content={seoKeywords} />
      <meta name="author" content={getInstitutionFullName()} />
      <meta name="generator" content={getPydahSoftInfo().companyName} />
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
      <meta property="og:url" content={websiteUrl} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={getInstitutionName()} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={websiteUrl} />
      <meta property="twitter:title" content={seoTitle} />
      <meta property="twitter:description" content={seoDescription} />
      <meta property="twitter:image" content={ogImageUrl} />
      <meta property="twitter:site" content="@pydahsoft" />

      {/* Canonical URL */}
      <link rel="canonical" href={websiteUrl} />
      
      {/* Additional SEO Meta Tags */}
      <meta name="application-name" content={getInstitutionName()} />
      <meta name="apple-mobile-web-app-title" content={getInstitutionName()} />
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
          "name": `${getInstitutionName()} Management System`,
          "description": "Digital hostel management portal for students and administrators",
          "url": websiteUrl,
          "applicationCategory": "EducationalApplication",
          "operatingSystem": "Web Browser",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": settings?.system?.currency || "INR"
          },
          "provider": {
            "@type": "Organization",
            "name": getPydahSoftInfo().companyName,
            "url": getPydahSoftInfo().website
          }
        })}
      </script>
    </Helmet>
  );
};

export default SEO; 