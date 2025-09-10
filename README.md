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

## 💡 Solution Overview
KitchenSync helps users:
- Track what’s in their kitchen (organized by fridge, freezer, pantry, spices)  
- Monitor expiration dates and get alerts  
- Scan barcodes or receipts for quick entry  
- Get recipe recommendations based on what they already own  
- Plan meals ahead to reduce waste  

We’ll build this step by step:
1. **MVP** – manual entry + barcode scanning  
2. **Smart management** – expirations + simple recipe matching  
3. **Stretch features** – receipt OCR, advanced recommendations, meal planning tools  

---

## 🚀 Key Features
- **Barcode scanning** (via OpenFoodFacts API)  
- **Receipt scanning** (OCR → groceries auto-added)  
- **Expiration tracking** (dates, defaults, alerts)  
- **Recipe suggestions** (using Food.com dataset)  
- **Meal planning & favorites** (optional add-on)  

---

## 📊 Data Sources (Proposed)
- **[OpenFoodFacts](https://openfoodfacts.github.io/openfoodfacts-server/api/)** – product metadata from barcodes  
- **[Food.com Recipes & Reviews](https://www.kaggle.com/datasets/irkaal/foodcom-recipes-and-reviews)** – large recipe dataset  

---

## ⚖️ Ethical & Legal Considerations
- **Privacy**: handle user data (receipts, inventory) securely  
- **Licensing**: ensure compliance with open data licenses  
- **Food safety**: alerts are guidance, not guarantees  
- **Transparency**: keep curated vs. generated content clear  

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
