// uiUtils.js - UI manipulation and helper functions

const uiUtils = {
    // Toggle section visibility
    toggleSection(headerEl) {
      const section = headerEl.parentElement;
      const content = section.querySelector(".section-content");
      const arrow = headerEl.querySelector(".arrow");  // Get the arrow SVG element
  
      // Toggle the display of section content
      content.style.display = content.style.display === "none" ? "block" : "none";
  
      // Toggle the rotation of the arrow
      if (content.style.display === "block") {
        arrow.classList.add("rotate");
      } else {
        arrow.classList.remove("rotate");
      }
    },
  
    // Update scroll buttons based on section content
    updateScrollButtons() {
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
            uiUtils.scrollToSection(section.id);
          };
          scrollButtons.appendChild(button);
        }
      });
    },
    
    // Scroll to specific section
    scrollToSection(id) {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };