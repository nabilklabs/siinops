// geoUtils.js - Geographical and distance calculation utilities

const geoUtils = {
    // Driver's starting location
    driverLat: 26.214405643565406,
    driverLong: 50.59370581495277,
  
    // Calculate distance between two points using Haversine formula
    calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371; // Radius of the earth in km
      const dLat = this.deg2rad(lat2 - lat1);
      const dLon = this.deg2rad(lon2 - lon1);
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
      const distance = R * c; // Distance in km
      return distance;
    },
  
    // Convert degrees to radians
    deg2rad(deg) {
      return deg * (Math.PI/180);
    },
  
    // Get flag emoji for country code
    getCountryFlag(countryCode) {
      // More comprehensive mapping for country codes
      const flagMap = {
        // Common country codes
        "BH": "🇧🇭", // Bahrain
        "US": "🇺🇸", // United States
        "GB": "🇬🇧", // United Kingdom (using GB as standard ISO code)
        "UK": "🇬🇧", // United Kingdom (alternative)
        "CA": "🇨🇦", // Canada
        "AU": "🇦🇺", // Australia
        "IN": "🇮🇳", // India
        "JP": "🇯🇵", // Japan
        "CN": "🇨🇳", // China
        "FR": "🇫🇷", // France
        "DE": "🇩🇪", // Germany
        "IT": "🇮🇹", // Italy
        "ES": "🇪🇸", // Spain
        
        // Middle East countries
        "SA": "🇸🇦", // Saudi Arabia
        "AE": "🇦🇪", // United Arab Emirates
        "KW": "🇰🇼", // Kuwait
        "QA": "🇶🇦", // Qatar
        "OM": "🇴🇲", // Oman
        "EG": "🇪🇬", // Egypt
        "JO": "🇯🇴", // Jordan
        "LB": "🇱🇧", // Lebanon
        "SY": "🇸🇾", // Syria
        "IQ": "🇮🇶", // Iraq
        "IR": "🇮🇷", // Iran
        
        // Other common countries
        "RU": "🇷🇺", // Russia
        "BR": "🇧🇷", // Brazil
        "MX": "🇲🇽", // Mexico
        "KR": "🇰🇷", // South Korea
        "ID": "🇮🇩", // Indonesia
        "TH": "🇹🇭", // Thailand
        "SG": "🇸🇬", // Singapore
        "MY": "🇲🇾", // Malaysia
        "TR": "🇹🇷", // Turkey
        "ZA": "🇿🇦"  // South Africa
      };
      
      if (!countryCode) return "🌐"; // Default globe emoji if code is missing
      
      // Try to match the country code (case insensitive)
      const upperCode = countryCode.toUpperCase();
      return flagMap[upperCode] || "🌐"; // Default globe emoji if code not found
    }
  };