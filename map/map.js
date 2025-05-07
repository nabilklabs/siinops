// Global variables
let map;
let routePolyline;
let markers = [];
let jsonData = []; // Store data for reuse between view changes
let currentView = 'pickup'; // Default view is pickup

// Driver's starting location
const driverLat = 26.214405643565406;
const driverLong = 50.59370581495277;

// Custom icon for map markers
function createCustomMarker(number, type, isStart = false) {
    // Create a div element for the custom marker
    const markerDiv = document.createElement('div');
    
    if (isStart) {
        markerDiv.className = 'start-marker';
        markerDiv.innerHTML = '<div class="marker-number">S</div>';
    } else if (type === 'pickup') {
        markerDiv.className = 'pickup-marker';
        markerDiv.innerHTML = `<div class="marker-number">${number}</div>`;
    } else if (type === 'dual') {
        markerDiv.className = 'dual-marker';
        markerDiv.innerHTML = `<div class="marker-number">${number}</div>`;
    } else if (type === 'delivery') {
        markerDiv.className = 'delivery-marker';
        markerDiv.innerHTML = `<div class="marker-number">${number}</div>`;
    }

    // Use L.divIcon to create a custom icon from the div
    return L.divIcon({
        html: markerDiv,
        className: '', // Empty class to avoid default CSS
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
}

// Initialize the map
document.addEventListener("DOMContentLoaded", function() {
    // Create the map centered on Bahrain
    map = L.map('map').setView([26.0667, 50.5577], 10);
    
    // Add the OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Setup view toggle buttons
    document.getElementById('pickup-toggle').addEventListener('click', function() {
        if (currentView !== 'pickup') {
            currentView = 'pickup';
            updateToggleButtons();
            refreshMap();
        }
    });
    
    document.getElementById('delivery-toggle').addEventListener('click', function() {
        if (currentView !== 'delivery') {
            currentView = 'delivery';
            updateToggleButtons();
            refreshMap();
        }
    });
    
    // Setup modal close button
    document.getElementById('modal-close').addEventListener('click', function() {
        document.getElementById('info-modal').style.display = 'none';
    });
    
    // Load the order data
    loadOrderData();
});

// Update the toggle button styles
function updateToggleButtons() {
    document.getElementById('pickup-toggle').classList.toggle('active', currentView === 'pickup');
    document.getElementById('delivery-toggle').classList.toggle('active', currentView === 'delivery');
    
    // Toggle legend visibility
    document.getElementById('pickup-legend').style.display = currentView === 'pickup' ? 'block' : 'none';
    document.getElementById('delivery-legend').style.display = currentView === 'delivery' ? 'block' : 'none';
}

// Refresh the map based on current view
function refreshMap() {
    // Clear current markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    // Clear route polyline if it exists
    if (routePolyline) {
        map.removeLayer(routePolyline);
        routePolyline = null;
    }
    
    // Process data based on current view
    if (currentView === 'pickup') {
        processPickupData(jsonData);
    } else {
        processDeliveryData(jsonData);
    }
}

// Function to load order data from API
async function loadOrderData() {
    try {
        // Use the API endpoint instead of local file
        const response = await fetch('https://api.test.siin.shop/v3/orders/public/get-24-hour-order?key=SIINSHOP');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const apiResponse = await response.json();
        
        // Check if the API response has the expected structure
        if (apiResponse.status && Array.isArray(apiResponse.data)) {
            jsonData = apiResponse.data;
            console.log("Order data loaded successfully:", jsonData.length, "orders");
            
            // Process the data for the map
            if (currentView === 'pickup') {
                processPickupData(jsonData);
            } else {
                processDeliveryData(jsonData);
            }
        } else {
            throw new Error("Invalid API response format");
        }
    } catch (error) {
        console.error("Failed to load order data:", error);
        alert("Error loading order data. Please try again later.");
    }
}

// Process data for pickup view
function processPickupData(data) {
    // Normalize data from API
    data.forEach(order => {
        // Convert string status to appropriate format
        if (order.ShippingStatus) {
            order.ShippingStatus = order.ShippingStatus.toLowerCase();
        }
        
        // Convert "paid" string to boolean
        if (order.Paid === "paid") {
            order.Paid = true;
        }
    });

    // Track customer names for determining dual roles
    const customerNames = new Set();
    
    // First pass: collect all customer names
    for (const order of data) {
        const customer = order.Customer?.trim();
        if (customer) {
            customerNames.add(customer);
        }
    }
    
    // Collect pickup locations (BH sellers with pending status)
    const pickupLocations = [];
    
    // Group orders by seller for the modal display
    const ordersBySeller = {};
    
    for (const order of data) {
        const sellerCountry = order.SellerCountry?.trim();
        const status = order.ShippingStatus?.trim().toLowerCase();
        const seller = order.Seller?.trim();
        const customer = order.Customer?.trim();
        const customerCountry = order.CustomerCountry?.trim();
        
        // Only process BH sellers with pending status
        if (sellerCountry === "BH" && status === "pending") {
            const sellerLat = order.SellerLatitude?.toString().trim();
            const sellerLong = order.SellerLongitude?.toString().trim();
            const item = order.Item?.trim();
            const total = order.Total?.toString().trim();
            const currency = order.CurrencyCode?.trim();
            const customerFlag = getCountryFlag(customerCountry);
            
            // Skip if missing location data
            if (!sellerLat || !sellerLong) continue;
            
            // Store order details grouped by seller for the modal
            if (!ordersBySeller[seller]) {
                ordersBySeller[seller] = {};
            }
            
            if (!ordersBySeller[seller][customer]) {
                ordersBySeller[seller][customer] = {
                    flag: customerFlag,
                    orders: []
                };
            }
            
            ordersBySeller[seller][customer].orders.push({
                item: item,
                total: total,
                currency: currency
            });
            
            // Check if this seller is already in our locations list
            const existingIndex = pickupLocations.findIndex(loc => loc.name === seller);
            
            if (existingIndex === -1) {
                // Check if seller is also a customer (dual role)
                const isAlsoCustomer = customerNames.has(seller);
                
                // Flag sellers who need to receive items first
                let hasOwnItems = false;
                if (isAlsoCustomer) {
                    // Check if this seller (as customer) has any orders in picked up status
                    for (const orderCheck of data) {
                        if (orderCheck.Customer === seller && 
                            orderCheck.ShippingStatus?.trim().toLowerCase() === "picked up") {
                            hasOwnItems = true;
                            break;
                        }
                    }
                }
                
                // Add to our list
                pickupLocations.push({
                    name: seller,
                    latitude: parseFloat(sellerLat),
                    longitude: parseFloat(sellerLong),
                    isDual: isAlsoCustomer,
                    hasOwnItems: hasOwnItems,
                    distance: calculateDistance(
                        driverLat, 
                        driverLong, 
                        parseFloat(sellerLat), 
                        parseFloat(sellerLong)
                    ),
                    orderDetails: ordersBySeller[seller]
                });
            } else {
                // Just update the order details for existing seller
                pickupLocations[existingIndex].orderDetails = ordersBySeller[seller];
            }
        }
    }
    
    // Sort the locations according to our route optimization logic
    pickupLocations.sort((a, b) => {
        // Primary sort: Sellers who need delivery first
        if (a.hasOwnItems && !b.hasOwnItems) return -1;
        if (!a.hasOwnItems && b.hasOwnItems) return 1;
        
        // Secondary sort: By distance (closest first)
        return a.distance - b.distance;
    });
    
    // Create a route with coordinates
    const routeCoordinates = [
        [driverLat, driverLong], // Start with driver's location
        ...pickupLocations.map(location => [location.latitude, location.longitude])
    ];
    
    // Draw the route and markers
    drawPickupRouteAndMarkers(routeCoordinates, pickupLocations);
}

// Process data for delivery view
function processDeliveryData(data) {
    // Normalize data from API
    data.forEach(order => {
        // Convert string status to appropriate format
        if (order.ShippingStatus) {
            order.ShippingStatus = order.ShippingStatus.toLowerCase();
        }
        
        // Convert "paid" string to boolean
        if (order.Paid === "paid") {
            order.Paid = true;
        }
    });

    // Collect delivery locations (customers with picked up status)
    const deliveryLocations = [];
    
    // Group orders by customer for the modal display
    const ordersByCustomer = {};
    
    for (const order of data) {
        const status = order.ShippingStatus?.trim().toLowerCase();
        const customer = order.Customer?.trim();
        const customerCountry = order.CustomerCountry?.trim();
        const seller = order.Seller?.trim();
        const sellerCountry = order.SellerCountry?.trim();
        
        // Only process customers with picked up status
        if (status === "picked up") {
            const customerLat = order.CustomerLatitude?.toString().trim();
            const customerLong = order.CustomerLongitude?.toString().trim();
            const item = order.Item?.trim();
            const total = order.Total?.toString().trim();
            const currency = order.CurrencyCode?.trim();
            const sellerFlag = getCountryFlag(sellerCountry);
            const paid = order.Paid === true;
            
            // Skip if missing location data
            if (!customerLat || !customerLong) continue;
            
            // Store order details grouped by customer for the modal
            if (!ordersByCustomer[customer]) {
                ordersByCustomer[customer] = {};
            }
            
            if (!ordersByCustomer[customer][seller]) {
                ordersByCustomer[customer][seller] = {
                    flag: sellerFlag,
                    orders: []
                };
            }
            
            ordersByCustomer[customer][seller].orders.push({
                item: item,
                total: total,
                currency: currency,
                paid: paid
            });
            
            // Check if this customer is already in our locations list
            const existingIndex = deliveryLocations.findIndex(loc => loc.name === customer);
            
            if (existingIndex === -1) {
                // Add to our list
                deliveryLocations.push({
                    name: customer,
                    latitude: parseFloat(customerLat),
                    longitude: parseFloat(customerLong),
                    country: customerCountry,
                    orderDetails: ordersByCustomer[customer]
                });
            } else {
                // Just update the order details for existing customer
                deliveryLocations[existingIndex].orderDetails = ordersByCustomer[customer];
            }
        }
    }
    
    // Add a marker for the starting point
    const startMarker = L.marker([driverLat, driverLong], {
        icon: createCustomMarker(0, 'pickup', true)
    }).addTo(map);
    startMarker.bindPopup("Starting Point");
    markers.push(startMarker);
    
    // Add markers for each delivery location
    deliveryLocations.forEach((location, index) => {
        const marker = L.marker([location.latitude, location.longitude], {
            icon: createCustomMarker(index + 1, 'delivery')
        }).addTo(map);
        
        // Add click handler to open the modal
        marker.on('click', function() {
            showLocationModal(location, 'delivery');
        });
        
        markers.push(marker);
    });
    
    // Fit the map to show all markers
    const allCoordinates = [
        [driverLat, driverLong],
        ...deliveryLocations.map(loc => [loc.latitude, loc.longitude])
    ];
    
    if (allCoordinates.length > 0) {
        const bounds = L.latLngBounds(allCoordinates);
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
}

function deg2rad(deg) {
    return deg * (Math.PI/180);
}

// Draw the pickup route and markers on the map
function drawPickupRouteAndMarkers(coordinates, locations) {
    // Add a marker for the starting point
    const startMarker = L.marker([driverLat, driverLong], {
        icon: createCustomMarker(0, 'pickup', true)
    }).addTo(map);
    startMarker.bindPopup("Starting Point");
    markers.push(startMarker);
    
    // Add markers for each pickup location with sequential numbers
    locations.forEach((location, index) => {
        const markerType = location.isDual ? 'dual' : 'pickup';
        const marker = L.marker([location.latitude, location.longitude], {
            icon: createCustomMarker(index + 1, markerType)
        }).addTo(map);
        
        // Add click handler to open the modal
        marker.on('click', function() {
            showLocationModal(location, 'pickup');
        });
        
        markers.push(marker);
    });
    
    // Draw a polyline for the route
    routePolyline = L.polyline(coordinates, {
        color: '#0078ff',
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 10',
        lineJoin: 'round'
    }).addTo(map);
    
    // Fit the map to show all markers
    if (coordinates.length > 0) {
        const bounds = L.latLngBounds(coordinates);
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Show the location modal with order details
function showLocationModal(location, viewType) {
    const modal = document.getElementById('info-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    // Set the modal title
    if (viewType === 'pickup') {
        modalTitle.textContent = `${location.name} - Pickup ${location.isDual ? '+ Delivery' : ''} Location`;
    } else {
        modalTitle.textContent = `${location.name} - Delivery Location`;
    }
    
    // Clear previous content
    modalBody.innerHTML = '';
    
    // Populate the modal with order details
    if (viewType === 'pickup') {
        // For pickup view, organize by customer
        Object.keys(location.orderDetails).forEach(customer => {
            const customerData = location.orderDetails[customer];
            
            const customerSection = document.createElement('div');
            customerSection.className = 'customer-section';
            
            const customerHeader = document.createElement('div');
            customerHeader.className = 'customer-header';
            customerHeader.innerHTML = `For ${customer} <span class="flag">${customerData.flag}</span>`;
            customerSection.appendChild(customerHeader);
            
            const ordersList = document.createElement('ul');
            ordersList.className = 'orders-list';
            
            customerData.orders.forEach(order => {
                const orderItem = document.createElement('li');
                orderItem.className = 'order-item';
                orderItem.innerHTML = `
                    <span class="item-name">${order.item}</span>
                    <span class="item-price">${order.total} ${order.currency}</span>
                `;
                ordersList.appendChild(orderItem);
            });
            
            customerSection.appendChild(ordersList);
            modalBody.appendChild(customerSection);
        });
    } else {
        // For delivery view, organize by seller
        Object.keys(location.orderDetails).forEach(seller => {
            const sellerData = location.orderDetails[seller];
            
            const sellerSection = document.createElement('div');
            sellerSection.className = 'customer-section';
            
            const sellerHeader = document.createElement('div');
            sellerHeader.className = 'customer-header';
            sellerHeader.innerHTML = `From ${seller} <span class="flag">${sellerData.flag}</span>`;
            sellerSection.appendChild(sellerHeader);
            
            const ordersList = document.createElement('ul');
            ordersList.className = 'orders-list';
            
            sellerData.orders.forEach(order => {
                const orderItem = document.createElement('li');
                orderItem.className = 'order-item';
                
                // Set price color based on paid status if delivery
                const priceColor = order.paid !== undefined ? (order.paid ? "#4CAF50" : "#f44336") : "inherit";
                
                orderItem.innerHTML = `
                    <span class="item-name">${order.item}</span>
                    <span class="item-price" style="color: ${priceColor};">${order.total} ${order.currency}</span>
                `;
                ordersList.appendChild(orderItem);
            });
            
            sellerSection.appendChild(ordersList);
            modalBody.appendChild(sellerSection);
        });
    }
    
    // Show the modal
    modal.style.display = 'block';
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