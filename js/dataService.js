// dataService.js - Handles data loading and processing

const dataService = {
    // Function to load order data from API
    async loadOrderData() {
      try {
        const response = await fetch('https://api.test.siin.shop/v3/orders/public/get-24-hour-order?key=SIINSHOP');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const apiResponse = await response.json();
        
        // Check if the response has the expected structure with 'data' array
        if (apiResponse.status && Array.isArray(apiResponse.data)) {
          jsonData = apiResponse.data;
          
          // Calculate and display date range
          const dateRange = this.getDateRange(jsonData);
          if (dateRange.earliest && dateRange.latest) {
            document.getElementById('dates').textContent = 
              `${dateUtils.formatMonthDay(dateRange.earliest)} - ${dateUtils.formatMonthDay(dateRange.latest)}`;
          }
          
          // Process the JSON data
          orderProcessingService.processOrderData(jsonData);
        } else {
          throw new Error("Invalid API response format");
        }
      } catch (error) {
        console.error("Failed to load order data:", error);
        alert("Error loading order data. Please try again later.");
      }
    },
  
    // Find earliest and latest dates in the data
    getDateRange(data) {
      if (!Array.isArray(data) || data.length === 0) {
        console.warn("Empty or invalid data passed to getDateRange()");
        return { earliest: null, latest: null };
      }
  
      let earliestDate = dateUtils.parseCustomDate(data[0].CreatedAt);
      let latestDate = dateUtils.parseCustomDate(data[0].CreatedAt);
  
      for (const item of data) {
        const date = dateUtils.parseCustomDate(item.CreatedAt);
        if (isNaN(date)) continue;
  
        if (date < earliestDate) earliestDate = date;
        if (date > latestDate) latestDate = date;
      }
  
      return { earliest: earliestDate, latest: latestDate };
    }
  };