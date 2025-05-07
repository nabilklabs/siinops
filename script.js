// Global variables to track data
let jsonData = [];
let csvData = "";  // Will store the JSON converted to CSV format for compatibility

// Load data as soon as the page loads
document.addEventListener("DOMContentLoaded", function() {
  loadOrderData();
  
// Set up the section toggle functionality
  document.querySelectorAll(".section h3").forEach(header => {
    header.addEventListener("click", function() {
      toggleSection(this);
    });
  });
  
  // Hide the upload container since we're loading directly from JSON
  const uploadContainer = document.querySelector(".upload-container");
  if (uploadContainer) {
    uploadContainer.style.display = "none";
  }
});

// Function to load order data from orders.json
async function loadOrderData() {
  try {
    const response = await fetch('orders.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    jsonData = await response.json();
    console.log("Order data loaded successfully:", jsonData.length, "orders");
    
    // Calculate and display date range
    const dateRange = getDateRange(jsonData);
    if (dateRange.earliest && dateRange.latest) {
      document.getElementById('dates').textContent = 
        `${formatMonthDay(dateRange.earliest)} - ${formatMonthDay(dateRange.latest)}`;
    }
    
    // Process the JSON data
    processOrderData(jsonData);
  } catch (error) {
    console.error("Failed to load order data:", error);
    alert("Error loading order data. Please try again later.");
  }
}

// Parse "DD/MM/YYYY, HH:mm" to a Date object
function parseCustomDate(dateStr) {
  const [datePart, timePart] = dateStr.split(', ');
  const [day, month, year] = datePart.split('/');
  const [hour, minute] = timePart.split(':');

  return new Date(
    Number(year),
    Number(month) - 1, // Months are 0-indexed
    Number(day),
    Number(hour),
    Number(minute)
  );
}

// Format a Date object as "Month Day" (e.g., "May 4")
function formatMonthDay(dateObj) {
  const options = { month: 'short', day: 'numeric' };
  return dateObj.toLocaleDateString('en-US', options);
}

// Find earliest and latest dates in the data
function getDateRange(data) {
  if (!Array.isArray(data) || data.length === 0) {
    console.warn("Empty or invalid data passed to getDateRange()");
    return { earliest: null, latest: null };
  }

  let earliestDate = parseCustomDate(data[0].CreatedAt);
  let latestDate = parseCustomDate(data[0].CreatedAt);

  for (const item of data) {
    const date = parseCustomDate(item.CreatedAt);
    if (isNaN(date)) continue;

    if (date < earliestDate) earliestDate = date;
    if (date > latestDate) latestDate = date;
  }

  return { earliest: earliestDate, latest: latestDate };
}

// Process the order data
function processOrderData(data) {
  // Store column indices globally for later use
  window.csvColumnIndices = {
    status: 'ShippingStatus',
    orderId: 'OrderID'
  };

  // Process data for status counts - track unique sellers
  let pendingSellers = new Set();
  let pickedUpSellers = new Set();
  let deliveredSellers = new Set();

  // Process data for all sections
  const sellers = {}; // For Local PickUp section
  const localCustomers = {}; // For Local Delivery section (BH customers)
  const siinCustomers = {}; // For Deliver to Siin section (non-BH customers)
  const customerNames = new Set(); // Track if seller is also a customer

  // First pass: collect all customer names
  for (const order of data) {
    const customer = order.Customer?.trim();
    if (customer) {
      customerNames.add(customer);
    }
  }

  // Process all orders
  for (const order of data) {
    const sellerCountry = order.SellerCountry?.trim();
    const customerCountry = order.CustomerCountry?.trim();
    const status = order.ShippingStatus?.trim().toLowerCase();
    const seller = order.Seller?.trim();
    const customer = order.Customer?.trim();
    
    // Count unique sellers for status cards (BH sellers only)
    if (sellerCountry === "BH") {
      if (status === "pending") pendingSellers.add(seller);
      else if (status === "picked up") pickedUpSellers.add(seller);
      else if (status === "delivered") deliveredSellers.add(seller);
    }
    
    // Process for Local PickUp section (BH sellers with pending status)
    if (sellerCountry === "BH" && status === "pending") {
      const sellerNumber = order.SellerNumber?.toString().trim();
      const sellerLat = order.SellerLatitude?.toString().trim();
      const sellerLong = order.SellerLongitude?.toString().trim();
      const orderId = order.OrderID?.toString().trim();
      const item = order.Item?.trim();
      const total = order.Total?.toString().trim();
      const currency = order.CurrencyCode?.trim();
      const customerFlag = getCountryFlag(customerCountry);
      
      // Skip if missing data
      if (!seller || !sellerNumber || !sellerLat || !sellerLong || !orderId) continue;
      
      // Check if seller is also a customer
      const isAlsoCustomer = customerNames.has(seller);
      
      // Add or update seller in our tracking object
      if (!sellers[seller]) {
        sellers[seller] = {
          name: seller,
          number: sellerNumber,
          latitude: sellerLat,
          longitude: sellerLong,
          orderCount: 0,
          isAlsoCustomer: isAlsoCustomer,
          orderIds: new Set(),
          orders: [],
          rowIndices: []
        };
      }
      
      // Add order details
      sellers[seller].orders.push({
        orderId: orderId,
        customer: customer,
        customerFlag: customerFlag,
        item: item,
        total: total,
        currency: currency
      });
      
      // Store DbID for updating status
      sellers[seller].rowIndices.push(order.DbID);
      
      // Count this order for the seller (only count unique order IDs)
      sellers[seller].orderIds.add(orderId);
    }
    
    // Process for Local Delivery and Deliver to Siin sections (Picked Up status)
    if (status === "picked up") {
      const customerNumber = order.CustomerNumber?.toString().trim();
      const customerLat = order.CustomerLatitude?.toString().trim();
      const customerLong = order.CustomerLongitude?.toString().trim();
      const orderId = order.OrderID?.toString().trim();
      const item = order.Item?.trim();
      const total = parseFloat(order.Total || 0);
      const currency = order.CurrencyCode?.trim();
      const paid = order.Paid === true;
      const sellerFlag = getCountryFlag(sellerCountry);
      
      // Skip if missing data
      if (!customer || !customerNumber || !customerLat || !customerLong || !orderId) continue;
      
      // FIXED: Determine if local or Siin delivery based on customer country
      const customerObj = customerCountry === "BH" ? localCustomers : siinCustomers;
      
      // Add or update customer in tracking object
      if (!customerObj[customer]) {
        customerObj[customer] = {
          name: customer,
          number: customerNumber,
          latitude: customerLat,
          longitude: customerLong,
          country: customerCountry,
          orderCount: 0,
          orderIds: new Set(),
          orders: [],
          rowIndices: [],
          unpaidTotal: 0
        };
      }
      
      // Add order details
      customerObj[customer].orders.push({
        orderId: orderId,
        seller: seller,
        sellerFlag: sellerFlag,
        item: item,
        total: total,
        currency: currency,
        paid: paid
      });
      
      // Calculate unpaid total
      if (!paid) {
        customerObj[customer].unpaidTotal += total;
      }
      
      // Store DbID for updating status
      customerObj[customer].rowIndices.push(order.DbID);
      
      // Count this order for the customer
      customerObj[customer].orderIds.add(orderId);
    }
  }

  // Calculate order counts and group data
  for (const seller in sellers) {
    sellers[seller].orderCount = sellers[seller].orderIds.size;
    
    // Group orders by customer
    const ordersByCustomer = {};
    sellers[seller].orders.forEach(order => {
      if (!ordersByCustomer[order.customer]) {
        ordersByCustomer[order.customer] = {
          flag: order.customerFlag,
          orders: []
        };
      }
      ordersByCustomer[order.customer].orders.push(order);
    });
    sellers[seller].ordersByCustomer = ordersByCustomer;
  }
  
  // Calculate order counts for customers
  for (const customer in localCustomers) {
    localCustomers[customer].orderCount = localCustomers[customer].orderIds.size;
    
    // Group orders by seller
    const ordersBySeller = {};
    localCustomers[customer].orders.forEach(order => {
      if (!ordersBySeller[order.seller]) {
        ordersBySeller[order.seller] = {
          flag: order.sellerFlag,
          orders: []
        };
      }
      ordersBySeller[order.seller].orders.push(order);
    });
    localCustomers[customer].ordersBySeller = ordersBySeller;
  }
  
  // Same for Siin customers
  for (const customer in siinCustomers) {
    siinCustomers[customer].orderCount = siinCustomers[customer].orderIds.size;
    
    // Group orders by seller
    const ordersBySeller = {};
    siinCustomers[customer].orders.forEach(order => {
      if (!ordersBySeller[order.seller]) {
        ordersBySeller[order.seller] = {
          flag: order.sellerFlag,
          orders: []
        };
      }
      ordersBySeller[order.seller].orders.push(order);
    });
    siinCustomers[customer].ordersBySeller = ordersBySeller;
  }

  // Update the status counts with the number of unique sellers
  document.getElementById("pendingCount").textContent = pendingSellers.size;
  document.getElementById("pickedUpCount").textContent = pickedUpSellers.size;
  document.getElementById("deliveredCount").textContent = deliveredSellers.size;
  
  // Render all sections
  renderLocalPickupSection(Object.values(sellers));
  renderLocalDeliverySection(Object.values(localCustomers));
  renderSiinDeliverySection(Object.values(siinCustomers));
  
  // Add scroll buttons for all active sections
  updateScrollButtons();
}

function renderLocalPickupSection(sellersArray) {
  // Sort sellers: those who are also customers come last
  sellersArray.sort((a, b) => {
    if (a.isAlsoCustomer && !b.isAlsoCustomer) return 1;
    if (!a.isAlsoCustomer && b.isAlsoCustomer) return -1;
    return 0;
  });
  
  // Clear and populate the pickup section
  const pickupSection = document.getElementById("pickup-section").querySelector(".section-content");
  pickupSection.innerHTML = "";
  
  if (sellersArray.length === 0) {
    pickupSection.innerHTML = "<div class='empty-message'>No pending orders to pick up</div>";
    return;
  }
  
  sellersArray.forEach(seller => {
    const card = document.createElement("div");
    card.className = "horizontal-card";
    
    const cardContent = document.createElement("div");
    cardContent.className = "card-content";
    
    const sellerName = document.createTextNode(seller.name);
    cardContent.appendChild(sellerName);
    
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = seller.orderCount;
    cardContent.appendChild(badge);
    
    // Add a delivery badge if the seller is also a customer
    if (seller.isAlsoCustomer) {
      const deliveryBadge = document.createElement("span");
      deliveryBadge.className = "badge";
      deliveryBadge.style.backgroundColor = "#4CAF50"; // Green badge
      deliveryBadge.style.marginLeft = "8px";
      deliveryBadge.textContent = "📦"; // Package emoji
      deliveryBadge.title = "This seller also has deliveries";
      cardContent.appendChild(deliveryBadge);
    }
    
    card.appendChild(cardContent);
    
    // WhatsApp button
    const whatsappBtn = document.createElement("button");
    whatsappBtn.className = "whatsapp-btn";
    whatsappBtn.textContent = "📲";
    whatsappBtn.onclick = function(event) {
      event.stopPropagation();
      openWhatsApp(seller.number);
    };
    card.appendChild(whatsappBtn);
    
    // Navigate button
    const navigateBtn = document.createElement("button");
    navigateBtn.className = "navigate-btn";
    navigateBtn.textContent = "📍";
    navigateBtn.onclick = function(event) {
      event.stopPropagation();
      openGoogleMaps(seller.latitude, seller.longitude);
    };
    card.appendChild(navigateBtn);
    
    // Create dropdown content for orders
    const dropdownContent = document.createElement("div");
    dropdownContent.className = "order-details";
    dropdownContent.style.display = "none";
    
    // Organize products by customer with flags
    Object.keys(seller.ordersByCustomer).forEach(customer => {
      const customerData = seller.ordersByCustomer[customer];
      
      const customerSection = document.createElement("div");
      customerSection.className = "customer-section";
      
      const customerHeader = document.createElement("div");
      customerHeader.className = "customer-header";
      customerHeader.innerHTML = `For ${customer} ${customerData.flag}`;
      customerSection.appendChild(customerHeader);
      
      const ordersList = document.createElement("ul");
      ordersList.className = "orders-list";
      
      customerData.orders.forEach(order => {
        const orderItem = document.createElement("li");
        orderItem.className = "order-item";
        orderItem.innerHTML = `
          <span class="item-name">${order.item}</span>
          <span class="item-price">${order.total} ${order.currency}</span>
        `;
        ordersList.appendChild(orderItem);
      });
      
      customerSection.appendChild(ordersList);
      dropdownContent.appendChild(customerSection);
    });
    
    // Add "Mark all as Picked Up" button
    const markAllButton = document.createElement("button");
    markAllButton.className = "mark-all-picked-btn";
    markAllButton.textContent = "Mark All as Picked Up";
    markAllButton.dataset.sellerName = seller.name;
    markAllButton.onclick = function(event) {
      event.stopPropagation();
      markAllAsPickedUp(seller.rowIndices, seller.name);
    };
    dropdownContent.appendChild(markAllButton);
    
    // Add all products dropdown to card
    card.appendChild(dropdownContent);
    
    // Add click event to toggle dropdown
    card.addEventListener("click", function() {
      const details = this.querySelector(".order-details");
      if (details.style.display === "none") {
        details.style.display = "block";
      } else {
        details.style.display = "none";
      }
    });
    
    pickupSection.appendChild(card);
  });
}

function renderLocalDeliverySection(customersArray) {
  // Sort customers by order count
  customersArray.sort((a, b) => b.orderCount - a.orderCount);
  
  // Clear and populate the local delivery section
  const deliverySection = document.getElementById("local-section").querySelector(".section-content");
  deliverySection.innerHTML = "";
  
  if (customersArray.length === 0) {
    deliverySection.innerHTML = "<div class='empty-message'>No orders to deliver locally</div>";
    return;
  }
  
  customersArray.forEach(customer => {
    const card = document.createElement("div");
    card.className = "horizontal-card";
    
    const cardContent = document.createElement("div");
    cardContent.className = "card-content";
    
    const customerName = document.createTextNode(customer.name);
    cardContent.appendChild(customerName);
    
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = customer.orderCount;
    cardContent.appendChild(badge);
    
    const countryFlag = document.createElement("span");
    countryFlag.className = "country-flag";
    countryFlag.textContent = getCountryFlag(customer.country);
    countryFlag.style.marginLeft = "8px";
    cardContent.appendChild(countryFlag);
    
    card.appendChild(cardContent);
    
    // WhatsApp button
    const whatsappBtn = document.createElement("button");
    whatsappBtn.className = "whatsapp-btn";
    whatsappBtn.textContent = "📲";
    whatsappBtn.onclick = function(event) {
      event.stopPropagation();
      openWhatsApp(customer.number);
    };
    card.appendChild(whatsappBtn);
    
    // Navigate button
    const navigateBtn = document.createElement("button");
    navigateBtn.className = "navigate-btn";
    navigateBtn.textContent = "📍";
    navigateBtn.onclick = function(event) {
      event.stopPropagation();
      openGoogleMaps(customer.latitude, customer.longitude);
    };
    card.appendChild(navigateBtn);
    
    // Create dropdown content for orders
    const dropdownContent = document.createElement("div");
    dropdownContent.className = "order-details";
    dropdownContent.style.display = "none";
    
    // Display unpaid total if there are unpaid orders
    if (customer.unpaidTotal > 0) {
      const unpaidTotalDiv = document.createElement("div");
      unpaidTotalDiv.className = "unpaid-total";
      unpaidTotalDiv.textContent = `Total Due: ${customer.unpaidTotal.toFixed(2)}`;
      dropdownContent.appendChild(unpaidTotalDiv);
    }
    
    // Organize products by seller with flags
    Object.keys(customer.ordersBySeller).forEach(seller => {
      const sellerData = customer.ordersBySeller[seller];
      
      const sellerSection = document.createElement("div");
      sellerSection.className = "seller-section";
      
      const sellerHeader = document.createElement("div");
      sellerHeader.className = "seller-header";
      sellerHeader.innerHTML = `From ${seller} ${sellerData.flag}`;
      sellerSection.appendChild(sellerHeader);
      
      const ordersList = document.createElement("ul");
      ordersList.className = "orders-list";
      
      sellerData.orders.forEach(order => {
        const orderItem = document.createElement("li");
        orderItem.className = "order-item";
        
        // Set price color based on paid status
        const priceColor = order.paid ? "#4CAF50" : "#f44336"; // Green if paid, red if not
        
        orderItem.innerHTML = `
          <span class="item-name">${order.item}</span>
          <span class="item-price" style="color: ${priceColor};">${order.total} ${order.currency}</span>
        `;
        ordersList.appendChild(orderItem);
      });
      
      sellerSection.appendChild(ordersList);
      dropdownContent.appendChild(sellerSection);
    });
    
    // Add "Mark all as Delivered" button
    const markAllDeliveredButton = document.createElement("button");
    markAllDeliveredButton.className = "mark-all-delivered-btn";
    markAllDeliveredButton.textContent = "Mark All as Delivered";
    markAllDeliveredButton.dataset.customerName = customer.name;
    markAllDeliveredButton.onclick = function(event) {
      event.stopPropagation();
      markAllAsDelivered(customer.rowIndices, customer.name);
    };
    dropdownContent.appendChild(markAllDeliveredButton);
    
    // Add all products dropdown to card
    card.appendChild(dropdownContent);
    
    // Add click event to toggle dropdown
    card.addEventListener("click", function() {
      const details = this.querySelector(".order-details");
      if (details.style.display === "none") {
        details.style.display = "block";
      } else {
        details.style.display = "none";
      }
    });
    
    deliverySection.appendChild(card);
  });
}

function renderSiinDeliverySection(customersArray) {
  // Sort customers by order count
  customersArray.sort((a, b) => b.orderCount - a.orderCount);
  
  // Clear and populate the Siin delivery section
  const siinSection = document.getElementById("deliver-section").querySelector(".section-content");
  siinSection.innerHTML = "";
  
  if (customersArray.length === 0) {
    siinSection.innerHTML = "<div class='empty-message'>No orders to deliver to Siin</div>";
    return;
  }
  
  customersArray.forEach(customer => {
    const card = document.createElement("div");
    card.className = "horizontal-card";
    
    const cardContent = document.createElement("div");
    cardContent.className = "card-content";
    
    const customerName = document.createTextNode(customer.name);
    cardContent.appendChild(customerName);
    
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = customer.orderCount;
    cardContent.appendChild(badge);
    
    const countryFlag = document.createElement("span");
    countryFlag.className = "country-flag";
    countryFlag.textContent = getCountryFlag(customer.country);
    countryFlag.style.marginLeft = "8px";
    cardContent.appendChild(countryFlag);
    
    card.appendChild(cardContent);
    
    // No WhatsApp or Navigate buttons for Siin delivery
    
    // Create dropdown content for orders
    const dropdownContent = document.createElement("div");
    dropdownContent.className = "order-details";
    dropdownContent.style.display = "none";
    
    // Display unpaid total if there are unpaid orders
    if (customer.unpaidTotal > 0) {
      const unpaidTotalDiv = document.createElement("div");
      unpaidTotalDiv.className = "unpaid-total";
      unpaidTotalDiv.textContent = `Total Due: ${customer.unpaidTotal.toFixed(2)}`;
      dropdownContent.appendChild(unpaidTotalDiv);
    }
    
    // Organize products by seller with flags
    Object.keys(customer.ordersBySeller).forEach(seller => {
      const sellerData = customer.ordersBySeller[seller];
      
      const sellerSection = document.createElement("div");
      sellerSection.className = "seller-section";
      
      const sellerHeader = document.createElement("div");
      sellerHeader.className = "seller-header";
      sellerHeader.innerHTML = `From ${seller} ${sellerData.flag}`;
      sellerSection.appendChild(sellerHeader);
      
      const ordersList = document.createElement("ul");
      ordersList.className = "orders-list";
      
      sellerData.orders.forEach(order => {
        const orderItem = document.createElement("li");
        orderItem.className = "order-item";
        
        // Set price color based on paid status
        const priceColor = order.paid ? "#4CAF50" : "#f44336"; // Green if paid, red if not
        
        orderItem.innerHTML = `
          <span class="item-name">${order.item}</span>
          <span class="item-price" style="color: ${priceColor};">${order.total} ${order.currency}</span>
        `;
        ordersList.appendChild(orderItem);
      });
      
      sellerSection.appendChild(ordersList);
      dropdownContent.appendChild(sellerSection);
    });
    
    // Add "Mark all as Delivered" button
    const markAllDeliveredButton = document.createElement("button");
    markAllDeliveredButton.className = "mark-all-delivered-btn";
    markAllDeliveredButton.textContent = "Mark All as Delivered";
    markAllDeliveredButton.dataset.customerName = customer.name;
    markAllDeliveredButton.onclick = function(event) {
      event.stopPropagation();
      markAllAsDelivered(customer.rowIndices, customer.name);
    };
    dropdownContent.appendChild(markAllDeliveredButton);
    
    // Add all products dropdown to card
    card.appendChild(dropdownContent);
    
    // Add click event to toggle dropdown
    card.addEventListener("click", function() {
      const details = this.querySelector(".order-details");
      if (details.style.display === "none") {
        details.style.display = "block";
      } else {
        details.style.display = "none";
      }
    });
    
    siinSection.appendChild(card);
  });
}

function getCountryFlag(countryCode) {
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

function updateScrollButtons() {
  const scrollButtons = document.querySelector(".scroll-buttons");
  scrollButtons.innerHTML = "";
  
  const sections = [
    { id: "pickup-section", text: "PickUp", hasContent: document.querySelector("#pickup-section .section-content").children.length > 0 },
    { id: "local-section", text: "Delivery", hasContent: document.querySelector("#local-section .section-content").children.length > 0 },
    { id: "deliver-section", text: "Siin", hasContent: document.querySelector("#deliver-section .section-content").children.length > 0 }
  ];
  
  sections.forEach(section => {
    if (section.hasContent) {
      const button = document.createElement("button");
      button.className = "scroll-btn";
      button.textContent = section.text;
      button.onclick = function() {
        scrollToSection(section.id);
      };
      scrollButtons.appendChild(button);
    }
  });
}

// FIXED: Added the missing scrollToSection function
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth" });
  }
}

function markAllAsPickedUp(dbIds, sellerName) {
  // Update the status in the JSON data
  dbIds.forEach(dbId => {
    const orderIndex = jsonData.findIndex(order => order.DbID === dbId);
    if (orderIndex !== -1) {
      jsonData[orderIndex].ShippingStatus = "Picked Up";
    }
  });
  
  // Find the button that triggered this and disable it
  const button = document.querySelector(`.mark-all-picked-btn[data-seller-name="${sellerName}"]`);
  if (button) {
    button.disabled = true;
    button.textContent = "All Picked Up";
    
    // Find the parent card to add visual indication
    const card = button.closest(".horizontal-card");
    const orderItems = card.querySelectorAll(".order-item");
    orderItems.forEach(item => {
      item.classList.add("picked-up");
    });
  }
  
  // Re-process data to update the UI
  processOrderData(jsonData);
  
  alert(`All orders from ${sellerName} have been marked as Picked Up!`);
}

function markAllAsDelivered(dbIds, customerName) {
  // Update the status in the JSON data
  dbIds.forEach(dbId => {
    const orderIndex = jsonData.findIndex(order => order.DbID === dbId);
    if (orderIndex !== -1) {
      jsonData[orderIndex].ShippingStatus = "Delivered";
    }
  });
  
  // Find the button that triggered this and disable it
  const button = document.querySelector(`.mark-all-delivered-btn[data-customer-name="${customerName}"]`);
  if (button) {
    button.disabled = true;
    button.textContent = "All Delivered";
    
    // Find the parent card to add visual indication
    const card = button.closest(".horizontal-card");
    const orderItems = card.querySelectorAll(".order-item");
    orderItems.forEach(item => {
      item.classList.add("delivered");
    });
  }
  
  // Re-process data to update the UI
  processOrderData(jsonData);
  
  alert(`All orders for ${customerName} have been marked as Delivered!`);
}

function openWhatsApp(phoneNumber) {
  window.open(
    `https://wa.me/${phoneNumber.replace(/[^\d]/g, "")}`,
    "_blank"
  );
}

function openGoogleMaps(latitude, longitude) {
  window.open(
    `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    "_blank"
  );
}

function toggleSection(headerEl) {
  const section = headerEl.parentElement;
  const content = section.querySelector(".section-content");
  content.style.display = content.style.display === "none" ? "block" : "none";
}
