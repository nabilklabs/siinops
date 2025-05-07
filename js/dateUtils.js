// dateUtils.js - Date parsing and formatting functions

const dateUtils = {
    // Parse "DD/MM/YYYY, HH:mm" to a Date object
    parseCustomDate(dateStr) {
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
    },
  
    // Format a Date object as "Month Day" (e.g., "May 4")
    formatMonthDay(dateObj) {
      const options = { month: 'short', day: 'numeric' };
      return dateObj.toLocaleDateString('en-US', options);
    }
  };