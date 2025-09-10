import { useEffect } from 'react';
import { useGlobalSettings } from '../context/GlobalSettingsContext';
import generateManifest from '../utils/manifestGenerator';

const DynamicManifest = () => {
  const { settings, loading } = useGlobalSettings();

  useEffect(() => {
    if (!loading) {
      // Generate dynamic manifest (use settings if available, otherwise use defaults)
      const manifest = generateManifest(settings);
      
      // Update the manifest link in the document head
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (manifestLink) {
        // Create a blob URL for the manifest
        const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], {
          type: 'application/json'
        });
        const manifestUrl = URL.createObjectURL(manifestBlob);
        
        // Update the href
        manifestLink.href = manifestUrl;
        
        // Update meta tags
        updateMetaTags(manifest);
      }
    }
  }, [settings, loading]);

  const updateMetaTags = (manifest) => {
    // Update application name
    const appNameMeta = document.querySelector('meta[name="application-name"]');
    if (appNameMeta) {
      appNameMeta.content = manifest.short_name;
    }

    // Update apple-mobile-web-app-title
    const appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitleMeta) {
      appleTitleMeta.content = manifest.short_name;
    }

    // Update title
    const titleElement = document.querySelector('title');
    if (titleElement) {
      titleElement.textContent = `${manifest.name} | ${manifest.short_name}`;
    }

    // Update description
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      descMeta.content = manifest.description;
    }
  };

  return null; // This component doesn't render anything
};

export default DynamicManifest;
