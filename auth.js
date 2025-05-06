// Auth.js - Authentication script for Siin Logistics
// The correct passcode
const CORRECT_PASSCODE = "9919"; // You can change this to any 4-digit code

// Wait for the document to be fully loaded
document.addEventListener("DOMContentLoaded", function() {
  // Hide all the main content first
  hideMainContent();
  
  // Create and display authentication overlay
  createAuthOverlay();
  
  // Initialize the authentication input fields
  initializeAuthInputs();
});

// Function to hide all the main content
function hideMainContent() {
  // Get all main content elements
  const elementsToHide = [
    document.querySelector('.logo-container'),
    document.querySelector('.section.stats'),
    document.querySelector('#dates').parentElement,
    document.querySelector('.scroll-buttons'),
    document.getElementById('pickup-section'),
    document.getElementById('local-section'),
    document.getElementById('deliver-section'),
    document.querySelector('.upload-container')
  ];
  
  // Hide each element
  elementsToHide.forEach(element => {
    if (element) {
      element.style.display = 'none';
    }
  });
}

// Function to show all the main content
function showMainContent() {
  // Show logo container
  const logoContainer = document.querySelector('.logo-container');
  if (logoContainer) logoContainer.style.display = 'block';
  
  // Show date section
  const dateSection = document.querySelector('#dates').parentElement;
  if (dateSection) dateSection.style.display = 'block';
  
  // Show stats section
  const statsSection = document.querySelector('.section.stats');
  if (statsSection) statsSection.style.display = 'flex';
  
  // Show scroll buttons
  const scrollButtons = document.querySelector('.scroll-buttons');
  if (scrollButtons) scrollButtons.style.display = 'flex';
  
  // Show all content sections
  const sections = [
    document.getElementById('pickup-section'),
    document.getElementById('local-section'),
    document.getElementById('deliver-section')
  ];
  
  sections.forEach(section => {
    if (section) section.style.display = 'block';
  });
}

// Function to create the authentication overlay
function createAuthOverlay() {
  // Create auth container
  const authContainer = document.createElement('div');
  authContainer.id = 'auth-container';
  authContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #1a1a1a;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;
  
  // Create logo container
  const logoContainer = document.createElement('div');
  logoContainer.style.cssText = `
    margin-bottom: 40px;
    text-align: center;
  `;
  
  // Create logo image
  const logoImg = document.createElement('img');
  logoImg.src = 'logo.png';
  logoImg.alt = 'Siin Logistics';
  logoImg.style.cssText = `
    width: 80px;
    height: auto;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  `;
  logoContainer.appendChild(logoImg);
  
  // Create title
  const title = document.createElement('h1');
  title.textContent = 'Siin Driver';
  title.style.cssText = `
    color: white;
    font-size: 1.5rem;
    margin-top: 15px;
    font-family: 'Montserrat', sans-serif;
  `;
  logoContainer.appendChild(title);
  
  // Create subtitle
  const subtitle = document.createElement('p');
  subtitle.textContent = 'Enter your passcode to continue';
  subtitle.style.cssText = `
    color: #ccc;
    font-size: 1rem;
    margin-top: 10px;
    font-family: 'Montserrat', sans-serif;
  `;
  logoContainer.appendChild(subtitle);
  
  // Add logo container to auth container
  authContainer.appendChild(logoContainer);
  
  // Create input container
  const inputContainer = document.createElement('div');
  inputContainer.id = 'passcode-inputs';
  inputContainer.style.cssText = `
    display: flex;
    justify-content: center;
    gap: 15px;
    margin-top: 20px;
  `;
  
  // Create 4 input fields for the passcode
  for (let i = 0; i < 4; i++) {
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'numeric'; // This will bring up numeric keyboard on mobile
    input.maxLength = 1;
    input.dataset.index = i;
    input.autocomplete = 'off';
    input.style.cssText = `
      width: 50px;
      height: 60px;
      font-size: 1.8rem;
      text-align: center;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      color: white;
      font-family: 'Montserrat', sans-serif;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    inputContainer.appendChild(input);
  }
  
  // Add input container to auth container
  authContainer.appendChild(inputContainer);
  
  // Create error message container
  const errorContainer = document.createElement('div');
  errorContainer.id = 'error-message';
  errorContainer.style.cssText = `
    color: #f44336;
    margin-top: 20px;
    font-family: 'Montserrat', sans-serif;
    text-align: center;
    min-height: 24px;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;
  authContainer.appendChild(errorContainer);
  
  // Add auth container to the document body
  document.body.appendChild(authContainer);
}

// Function to initialize the authentication input fields
function initializeAuthInputs() {
  const inputs = document.querySelectorAll('#passcode-inputs input');
  
  // Event listener for each input field
  inputs.forEach((input, index) => {
    // Focus first input on page load
    if (index === 0) {
      setTimeout(() => input.focus(), 500);
    }
    
    // Handle input events
    input.addEventListener('input', function(e) {
      const value = e.target.value;
      
      // Only allow numbers
      if (!/^\d*$/.test(value)) {
        input.value = '';
        return;
      }
      
      // Auto-focus next input field if value is entered
      if (value !== '' && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
      
      // Check passcode when the last digit is entered
      if (index === inputs.length - 1 && value !== '') {
        setTimeout(() => checkPasscode(), 100);
      }
    });
    
    // Handle keydown events for backspace
    input.addEventListener('keydown', function(e) {
      // If backspace is pressed and input is empty, focus previous input
      if (e.key === 'Backspace' && input.value === '' && index > 0) {
        inputs[index - 1].focus();
      }
    });
    
    // Handle focus events
    input.addEventListener('focus', function() {
      input.select(); // Select all text when focused
    });
  });
}

// Function to check the entered passcode
function checkPasscode() {
  const inputs = document.querySelectorAll('#passcode-inputs input');
  const errorMessage = document.getElementById('error-message');
  
  // Get the entered passcode
  let enteredPasscode = '';
  inputs.forEach(input => {
    enteredPasscode += input.value;
  });
  
  // Check if the passcode is correct
  if (enteredPasscode === CORRECT_PASSCODE) {
    // Hide the auth container
    const authContainer = document.getElementById('auth-container');
    authContainer.style.opacity = '0';
    authContainer.style.transition = 'opacity 0.5s ease';
    
    // Remove auth container and show main content after animation
    setTimeout(() => {
      authContainer.remove();
      showMainContent();
    }, 500);
  } else {
    // Show error message
    errorMessage.textContent = 'Incorrect passcode. Please try again.';
    errorMessage.style.opacity = '1';
    
    // Clear all inputs
    inputs.forEach(input => {
      input.value = '';
    });
    
    // Focus first input
    inputs[0].focus();
    
    // Hide error message after 3 seconds
    setTimeout(() => {
      errorMessage.style.opacity = '0';
    }, 3000);
  }
}