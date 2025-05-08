// uiRendererService.js - Handles UI rendering for different sections

const uiRendererService = {
    // Render local pickup section
    renderLocalPickupSection(sellersArray) {
      // NEW SORTING LOGIC FOR LOCAL PICKUP SECTION
      
      // Calculate distance from current location for each seller
      sellersArray.forEach(seller => {
        seller.distance = geoUtils.calculateDistance(
          geoUtils.driverLat, 
          geoUtils.driverLong, 
          parseFloat(seller.latitude), 
          parseFloat(seller.longitude)
        );
        
        // Flag sellers where user needs to visit them as a customer first (for delivery)
        seller.hasOwnItems = false;
        if (seller.isAlsoCustomer) {
          // Check if this seller (as customer) has any orders in picked up status
          const sellerName = seller.name;
          for (const order of jsonData) {
            if (order.Customer === sellerName && 
                order.ShippingStatus?.trim().toLowerCase() === "picked up") {
              seller.hasOwnItems = true;
              break;
            }
          }
        }
      });
      
      // First sort: Visit sellers who need delivery first (are also customers with items to receive)
      // Then sort by distance from current location
      sellersArray.sort((a, b) => {
        // Primary sort: Sellers who need delivery first
        if (a.hasOwnItems && !b.hasOwnItems) return -1;
        if (!a.hasOwnItems && b.hasOwnItems) return 1;
        
        // Secondary sort: By distance (closest first)
        return a.distance - b.distance;
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

        // Check if the seller's longitude is the specific value
        if (seller.longitude === 26.21429383309266) {
          navigateBtn.textContent = "Siin";
          navigateBtn.style.backgroundColor = "red";  // Change button color to red
        } else {
          navigateBtn.textContent = "📍";
        }

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
              <span class="item-name">${order.item.startsWith("1x ") ? order.item.substring(3) : order.item}</span>
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
    },
  
    // Render local delivery section
    renderLocalDeliverySection(customersArray) {
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
        countryFlag.textContent = geoUtils.getCountryFlag(customer.country);
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
              <span class="item-name">${order.item.startsWith("1x ") ? order.item.substring(3) : order.item}</span>
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
    },
  
    // Render Siin delivery section
    renderSiinDeliverySection(customersArray) {
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
        countryFlag.textContent = geoUtils.getCountryFlag(customer.country);
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
              <span class="item-name">${order.item.startsWith("1x ") ? order.item.substring(3) : order.item}</span>
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
  };