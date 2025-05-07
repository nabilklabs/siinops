// navigationUtils.js - Navigation and external link utilities

const navigationUtils = {
    // Open WhatsApp with given phone number
    openWhatsApp(phoneNumber) {
      window.open(
        `https://wa.me/${phoneNumber.replace(/[^\d]/g, "")}`,
        "_blank"
      );
    },
  
    // Open Google Maps with given coordinates
    openGoogleMaps(latitude, longitude) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
        "_blank"
      );
    }
  };