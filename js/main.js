// main.js - Main entry point and event handlers

// Global variables to track data
let jsonData = [];
let csvData = "";  // Will store the JSON converted to CSV format for compatibility

// Load data as soon as the page loads
document.addEventListener("DOMContentLoaded", function() {
  dataService.loadOrderData();
  
  // Set up the section toggle functionality
  document.querySelectorAll(".section h3").forEach(header => {
    header.addEventListener("click", function() {
      uiUtils.toggleSection(this);
    });
  });
  
  // Hide the upload container since we're loading directly from JSON
  const uploadContainer = document.querySelector(".upload-container");
  if (uploadContainer) {
    uploadContainer.style.display = "none";
  }
});

// Global functions for event handlers (need to be global for inline HTML event handling)
function markAllAsPickedUp(dbIds, sellerName) {
  orderService.markAllAsPickedUp(dbIds, sellerName);
}

function markAllAsDelivered(dbIds, customerName) {
  orderService.markAllAsDelivered(dbIds, customerName);
}

function openWhatsApp(phoneNumber) {
  navigationUtils.openWhatsApp(phoneNumber);
}

function openGoogleMaps(latitude, longitude) {
  navigationUtils.openGoogleMaps(latitude, longitude);
}

function scrollToSection(id) {
  uiUtils.scrollToSection(id);
}