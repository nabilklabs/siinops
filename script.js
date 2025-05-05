document.getElementById("csvUpload").addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    const text = e.target.result;
    processCSV(text);
  };

  reader.readAsText(file);
});

function processCSV(csvText) {
  // Store the CSV data globally for later use
  window.csvData = csvText;
  
  const rows = csvText.split("\n").map(row => row.trim()).filter(Boolean);
  const headers = rows[0].split(",");

  // Find required column indices
  const statusIndex = headers.findIndex(h => h.trim().toLowerCase() === "shipping status");
  const sellerCountryIndex = headers.findIndex(h => h.trim().toLowerCase() === "seller country");
  const sellerIndex = headers.findIndex(h => h.trim().toLowerCase() === "seller");
  const sellerNumberIndex = headers.findIndex(h => h.trim().toLowerCase() === "seller number");
  const sellerLatIndex = headers.findIndex(h => h.trim().toLowerCase() === "seller latitude");
  const sellerLongIndex = headers.findIndex(h => h.trim().toLowerCase() === "seller longitude");
  const customerIndex = headers.findIndex(h => h.trim().toLowerCase() === "customer");
  const customerCountryIndex = headers.findIndex(h => h.trim().toLowerCase() === "customer country");
  const customerNumberIndex = headers.findIndex(h => h.trim().toLowerCase() === "customer number");
  const customerLatIndex = headers.findIndex(h => h.trim().toLowerCase() === "customer latitude");
  const customerLongIndex = headers.findIndex(h => h.trim().toLowerCase() === "customer longitude");
  const orderIdIndex = headers.findIndex(h => h.trim().toLowerCase() === "order id");
  const itemIndex = headers.findIndex(h => h.trim().toLowerCase() === "item");
  const totalIndex = headers.findIndex(h => h.trim().toLowerCase() === "total");
  const currencyIndex = headers.findIndex(h => h.trim().toLowerCase() === "currency code");
  const paidIndex = headers.findIndex(h => h.trim().toLowerCase() === "paid");

  // Check if all required columns exist
  if (statusIndex === -1 || sellerCountryIndex === -1 || sellerIndex === -1 || 
      sellerNumberIndex === -1 || sellerLatIndex === -1 || sellerLongIndex === -1 || 
      customerIndex === -1 || customerCountryIndex === -1 || customerNumberIndex === -1 ||
      customerLatIndex === -1 || customerLongIndex === -1 || orderIdIndex === -1 || 
      itemIndex === -1 || totalIndex === -1 || currencyIndex === -1 || paidIndex === -1) {
    alert("One or more required columns are missing from the CSV file.");
    return;
  }

  // Store column indices globally for later use
  window.csvColumnIndices = {
    status: statusIndex,
    orderId: orderIdIndex
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
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i].split(",");
    const customer = cols[customerIndex]?.trim();
    if (customer) {
      customerNames.add(customer);
    }
  }

  // Process all rows
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i].split(",");
    const sellerCountry = cols[sellerCountryIndex]?.trim();
    const customerCountry = cols[customerCountryIndex]?.trim();
    const status = cols[statusIndex]?.trim().toLowerCase();
    const seller = cols[sellerIndex]?.trim();
    const customer = cols[customerIndex]?.trim();
    
    // Count unique sellers for status cards (BH sellers only)
    if (sellerCountry === "BH") {
      if (status === "pending") pendingSellers.add(seller);
      else if (status === "picked up") pickedUpSellers.add(seller);
      else if (status === "delivered") deliveredSellers.add(seller);
    }
    
    // Process for Local PickUp section (BH sellers with pending status)
    if (sellerCountry === "BH" && status === "pending") {
      const sellerNumber = cols[sellerNumberIndex]?.trim();
      const sellerLat = cols[sellerLatIndex]?.trim();
      const sellerLong = cols[sellerLongIndex]?.trim();
      const orderId = cols[orderIdIndex]?.trim();
      const item = cols[itemIndex]?.trim();
      const total = cols[totalIndex]?.trim();
      const currency = cols[currencyIndex]?.trim();
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
      
      // Store row index for updating status
      sellers[seller].rowIndices.push(i);
      
      // Count this order for the seller (only count unique order IDs)
      sellers[seller].orderIds.add(orderId);
    }
    
    // Process for Local Delivery and Deliver to Siin sections (Picked Up status)
    if (status === "picked up") {
      const customerNumber = cols[customerNumberIndex]?.trim();
      const customerLat = cols[customerLatIndex]?.trim();
      const customerLong = cols[customerLongIndex]?.trim();
      const orderId = cols[orderIdIndex]?.trim();
      const item = cols[itemIndex]?.trim();
      const total = parseFloat(cols[totalIndex]?.trim() || 0);
      const currency = cols[currencyIndex]?.trim();
      const paid = cols[paidIndex]?.trim().toLowerCase() === "true";
      const sellerFlag = getCountryFlag(sellerCountry);
      
      // Skip if missing data
      if (!customer || !customerNumber || !customerLat || !customerLong || !orderId) continue;
      
      // Determine if local or Siin delivery based on customer country
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
      
      // Store row index for updating status
      customerObj[customer].rowIndices.push(i);
      
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
    navigateBtn.textContent = "Navigate";
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
    navigateBtn.textContent = "Navigate";
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

function markAllAsPickedUp(rowIndices, sellerName) {
  if (!window.csvData) {
    alert("CSV data not available. Please upload the file again.");
    return;
  }
  
  const rows = window.csvData.split("\n");
  const statusIndex = window.csvColumnIndices.status;
  
  // Update the status in the CSV data for all rows from this seller
  rowIndices.forEach(rowIndex => {
    const rowData = rows[rowIndex].split(",");
    rowData[statusIndex] = "Picked Up";
    rows[rowIndex] = rowData.join(",");
  });
  
  // Update the global CSV data
  window.csvData = rows.join("\n");
  
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
  
  // Recalculate stats and update UI
  processCSV(window.csvData);
  
  alert(`All orders from ${sellerName} have been marked as Picked Up!`);
}
function markAllAsDelivered(rowIndices, customerName) {
  if (!window.csvData) {
    alert("CSV data not available. Please upload the file again.");
    return;
  }
  
  const rows = window.csvData.split("\n");
  const statusIndex = window.csvColumnIndices.status;
  
  // Update the status in the CSV data for all rows for this customer
  rowIndices.forEach(rowIndex => {
    const rowData = rows[rowIndex].split(",");
    rowData[statusIndex] = "Delivered";
    rows[rowIndex] = rowData.join(",");
  });
  
  // Update the global CSV data
  window.csvData = rows.join("\n");
  
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
  
  // Recalculate stats and update UI
  processCSV(window.csvData);
  
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

function scrollToSection(id) {
  const el = document.getElementById(id);
  el.scrollIntoView({ behavior: "smooth" });
}