// orderService.js - Handles order status updates and related functions

const orderService = {
  // Mark all orders as picked up for a seller
  async markAllAsPickedUp(dbIds, sellerName) {
    
    try {
      // Make API call to update status to INPROGRESS for all orders at once
      const response = await fetch('https://api.test.siin.shop/v3/orders/multiple/status?key=SIINSHOP', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          "_id": dbIds, // Send the array of IDs directly
          "deliveryStatus": "INPROGRESS"
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error! Status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Update local data after successful API call
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
      orderProcessingService.processOrderData(jsonData);
      
      alert(`All orders from ${sellerName} have been marked as Picked Up!`);
    } catch (error) {
      console.error('Error updating order status:', error);
      alert(`Error updating orders: ${error.message}`);
    }
  },

  // Mark all orders as delivered for a customer
  async markAllAsDelivered(dbIds, customerName) {
    
    try {
      // Make API call to update status to DELIVERED for all orders at once
      const response = await fetch('https://api.test.siin.shop/v3/orders/multiple/status?key=SIINSHOP', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          "_id": dbIds, // Send the array of IDs directly
          "deliveryStatus": "DELIVERED"
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error! Status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Update local data after successful API call
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
      orderProcessingService.processOrderData(jsonData);
      
      alert(`All orders for ${customerName} have been marked as Delivered!`);
    } catch (error) {
      console.error('Error updating order status:', error);
      alert(`Error updating orders: ${error.message}`);
    }
  }
};