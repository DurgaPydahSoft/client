import { Helmet } from 'react-helmet-async';

const defaultTitle = 'Pydah Hostel Digital | Online Hostel Portal';
const defaultDescription = 'Pydah Hostel\'s official digital platform for hostel operations and student services. A Pydah Soft Product.';
const defaultKeywords = 'Pydah Hostel, Hostel Digital, Pydah College Hostel, Hostel Operations, Hostel Services, Online Hostel Portal, Student Services, Pydah Soft';
const defaultAuthor = 'Pydah Educational Institutions';
const defaultGenerator = 'Pydah Soft';

const SEO = ({ 
  title, 
  description, 
  keywords, 
  ogImage = 'https://hostel.pydah.edu/og-image.jpg',
  ogType = 'website',
  canonicalUrl = 'https://hostel.pydah.edu'
}) => {
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
      <meta name="author" content={defaultAuthor} />
      <meta name="generator" content={defaultGenerator} />
      
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