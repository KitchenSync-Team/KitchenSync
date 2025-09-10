# KitchenSync 🥫🥕

A smart kitchen management app to reduce food waste and make meal planning easier.  
This document is a **working draft** of our team’s shared vision. Everyone should feel free to add, comment, or refine based on their expertise.

---

## 📌 Problem
Food waste is expensive, unsustainable, and preventable. Many households:
- Forget what food they already own  
- Let groceries expire before use  
- Struggle to plan meals around what’s on hand  

KitchenSync tackles this problem by giving users better visibility into their kitchen and smarter ways to use what they buy.

---

## 🗂️ App Overview
KitchenSync organizes the kitchen into intuitive sections, making it easier to manage what you own:
- **Fridge** – perishable items that expire quickly  
- **Freezer** – longer-term frozen goods  
- **Pantry** – shelf-stable items  
- **Spice Rack** – herbs and spices that don’t expire quickly but help with recipes  

Within each section, users will be able to add, track, and manage their food. The app connects these sections to features like expiration alerts and recipe recommendations.

---

## 🚀 Key Features
- **📷 Barcode Scanning** – Quickly add products by scanning UPC codes (via OpenFoodFacts).  
- **🧾 Receipt Scanning** – Upload receipts to auto-add purchased items.  
- **⏰ Expiration Tracking** – Monitor food lifespans and receive timely alerts.  
- **🍳 Recipe Recommendations** – Suggest meals based on what’s already in the kitchen (via Food.com dataset).  
- **📝 Meal Planning & Favorites** – Browse, save, and plan recipes to reduce waste.  

---

## 💡 Solution Approach
We’ll build KitchenSync in clear phases:
1. **MVP** – Manual entry + barcode scanning.  
2. **Smart Management** – Expiration tracking and simple recipe matching.  
3. **Advanced Features** – Receipt OCR, enhanced recommendations, and meal planning.  

---

## 📊 Data Sources
- **[OpenFoodFacts](https://openfoodfacts.github.io/openfoodfacts-server/api/)** – product metadata from barcodes.  
- **[Food.com Recipes & Reviews](https://www.kaggle.com/datasets/irkaal/foodcom-recipes-and-reviews)** – large recipe dataset.  

---

## ⚖️ Ethical & Legal Considerations
- **Privacy**: user data (receipts, kitchen items) must be handled securely.  
- **Licensing**: compliance with open data licenses.  
- **Food Safety**: expiration alerts should be framed as guidance, not guarantees.  
- **Transparency**: curated vs. generated content must be clearly communicated.  

---

## 🛠️ Possible Tech Stack
- Frontend: React Native or Flutter  
- Backend: Firebase or Node.js/Express  
- Database: Firestore or PostgreSQL  
- OCR: Tesseract.js or Google Vision API  

---

## 👥 Team
University of Cincinnati – Senior Design Team  
- Drake Damron  
- Jason Welsh  
- Prashansa Dhakal  
- Brendan Swartz  
- Somyani Ghimire  

---

## ✨ Next Steps
- Each teammate reviews this draft  
- Suggest edits, new ideas, or scope changes based on your background  
- Agree on MVP scope for Fall semester  
