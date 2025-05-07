// orderProcessingService.js - Handles order data processing

const orderProcessingService = {
    // Process the order data
    processOrderData(data) {
      // Adapt for API response data structure
      // Map 'paid' string to boolean for compatibility with original code
      data.forEach(order => {
        if (order.Paid === 'paid') {
          order.Paid = true;
        } else if (order.Paid === 'unpaid') {
          order.Paid = false;
        }
        
        // Convert shipping status to match expected format
        if (order.ShippingStatus === 'pending') {
          order.ShippingStatus = 'pending';
        } else if (order.ShippingStatus === 'delivered') {
          order.ShippingStatus = 'delivered';
        } else if (order.ShippingStatus === 'picked up') {
          order.ShippingStatus = 'picked up';
        }
      });
  
      // Store column indices globally for later use
      window.csvColumnIndices = {
        status: 'ShippingStatus',
        orderId: 'DbID'  // Using DbID from API instead of OrderID
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
          const orderId = order.DbID?.toString().trim();  // Using DbID from API
          const item = order.Item?.trim();
          const total = order.Total?.toString().trim();
          const currency = order.CurrencyCode?.trim();
          const customerFlag = geoUtils.getCountryFlag(customerCountry);
          
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
          const orderId = order.DbID?.toString().trim();  // Using DbID from API
          const item = order.Item?.trim();
          const total = parseFloat(order.Total || 0);
          const currency = order.CurrencyCode?.trim();
          const paid = order.Paid === true;
          const sellerFlag = geoUtils.getCountryFlag(sellerCountry);
          
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
      uiRendererService.renderLocalPickupSection(Object.values(sellers));
      uiRendererService.renderLocalDeliverySection(Object.values(localCustomers));
      uiRendererService.renderSiinDeliverySection(Object.values(siinCustomers));
      
      // Add scroll buttons for all active sections
      uiUtils.updateScrollButtons();
    }
  };