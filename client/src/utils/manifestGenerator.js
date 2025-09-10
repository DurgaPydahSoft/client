export const generateManifest = (settings) => {
  const institutionName = settings?.institution?.name || "Pydah Hostel";
  const shortName = settings?.institution?.shortName || "Pydah Hostel";
  const fullName = settings?.institution?.fullName || "Pydah Educational Institutions";
  const websiteUrl = settings?.urls?.website || "https://hms.pydahsoft.in";
  const pydahSoftInfo = settings?.pydahsoft || { companyName: "PydahSoft", website: "https://pydahsoft.in" };

  return {
    "name": `${institutionName} Management System`,
    "short_name": shortName,
    "description": `Digital hostel management system for ${fullName}. Manage complaints, attendance, fees, and student services.`,
    "start_url": "/",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#1e40af",
    "orientation": "portrait-primary",
    "scope": "/",
    "lang": "en",
    "categories": ["education", "productivity", "utilities"],
    "keywords": [`${institutionName.toLowerCase()}`, "hostel management", "student portal", "digital hostel", pydahSoftInfo.companyName.toLowerCase()],
    "author": pydahSoftInfo.companyName,
    "icons": [
      {
        "src": "/images/icon-72x72.png",
        "sizes": "72x72",
        "type": "image/png",
        "purpose": "maskable any"
      },
      {
        "src": "/images/icon-96x96.png",
        "sizes": "96x96",
        "type": "image/png",
        "purpose": "maskable any"
      },
      {
        "src": "/images/icon-128x128.png",
        "sizes": "128x128",
        "type": "image/png",
        "purpose": "maskable any"
      },
      {
        "src": "/images/icon-144x144.png",
        "sizes": "144x144",
        "type": "image/png",
        "purpose": "maskable any"
      },
      {
        "src": "/images/icon-152x152.png",
        "sizes": "152x152",
        "type": "image/png",
        "purpose": "maskable any"
      },
      {
        "src": "/images/icon-192x192.png",
        "sizes": "192x192",
        "type": "image/png",
        "purpose": "maskable any"
      },
      {
        "src": "/images/icon-384x384.png",
        "sizes": "384x384",
        "type": "image/png",
        "purpose": "maskable any"
      },
      {
        "src": "/images/icon-512x512.png",
        "sizes": "512x512",
        "type": "image/png",
        "purpose": "maskable any"
      }
    ],
    "screenshots": [
      {
        "src": "/images/screenshot-wide.png",
        "sizes": "1280x720",
        "type": "image/png",
        "form_factor": "wide",
        "label": `${institutionName} Management System Dashboard`
      },
      {
        "src": "/images/screenshot-narrow.png",
        "sizes": "750x1334",
        "type": "image/png",
        "form_factor": "narrow",
        "label": `${institutionName} Mobile Interface`
      }
    ],
    "shortcuts": [
      {
        "name": "Student Dashboard",
        "short_name": "Dashboard",
        "description": "Access student dashboard",
        "url": "/student/dashboard",
        "icons": [{ "src": "/icon-192x192.png", "sizes": "192x192" }]
      },
      {
        "name": "Leave Management",
        "short_name": "Leave",
        "description": "Apply for leave or permission",
        "url": "/student/leave",
        "icons": [{ "src": "/icon-192x192.png", "sizes": "192x192" }]
      },
      {
        "name": "Complaints",
        "short_name": "Complaints",
        "description": "Raise hostel complaints",
        "url": "/student/complaints",
        "icons": [{ "src": "/icon-192x192.png", "sizes": "192x192" }]
      }
    ],
    "related_applications": [
      {
        "platform": "webapp",
        "url": websiteUrl
      }
    ],
    "prefer_related_applications": false,
    "edge_side_panel": {
      "preferred_width": 400
    }
  };
};

export default generateManifest;
