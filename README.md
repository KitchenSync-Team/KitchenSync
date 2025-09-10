# KitchenSync 🥫🥕

*A smart kitchen management app to reduce food waste and make meal planning easier.*  

---

## 📌 Vision  
Every year, households throw away food that could have been used — wasting money and resources. **KitchenSync** is designed to change that. By helping users track what’s in their kitchens, monitor expiration dates, and recommend recipes based on ingredients already on hand, we aim to make cooking simpler, smarter, and more sustainable.  

Our goal: **help people save money, reduce food waste, and cook smarter.**  

---

## 🗂️ Kitchen Organization  
KitchenSync divides the kitchen into intuitive sections, making it easy to manage what you own:  
- **Fridge**  
- **Freezer**  
- **Pantry**  
- **Spice Rack** (for long-lasting herbs and spices that help recipe matching)  

---

## 🚀 Core Features  

- **📷 Barcode Scanning**  
  Quickly add products to your digital kitchen using UPC codes.  

- **🧾 Receipt Scanning & Parsing**  
  Upload a grocery receipt — our system extracts and normalizes items, then auto-assigns them to the right kitchen section.  

- **⏰ Expiration Tracking**  
  Track food lifespans using expiration dates, sell-by dates, or estimated shelf life.  
  Receive alerts when items are nearing their end of life.  

- **🍳 Recipe Recommendations**  
  Suggest meals based on what’s in your kitchen.  
  - Prioritize recipes that prevent waste (use expiring items first).  
  - Recommend meals requiring minimal extra shopping.  
  - Allow filtering by dietary needs, prep time, and more.  

- **📝 Meal Planning & Favorites (Bonus Feature)**  
  Browse our recipe catalog, save favorites, and plan meals in advance to reduce waste.  

---

## 📊 Data Sources  

- **[OpenFoodFacts API](https://openfoodfacts.github.io/openfoodfacts-server/api/)**  
  - Provides product metadata from barcodes (ingredients, categories, nutrition, sometimes shelf life).  
  - Powers **barcode scanning** and **inventory enrichment**.  

- **[Food.com Recipes & Reviews (Kaggle)](https://www.kaggle.com/datasets/irkaal/foodcom-recipes-and-reviews)**  
  - 230,000+ real-world recipes with instructions, ingredients, and user reviews.  
  - Powers **recipe recommendations** and **meal planning**.  

---

## 📅 Project Roadmap (Capstone Scope)  

### **Phase 1 – Core MVP**  
- Manual product entry + barcode scanning (OpenFoodFacts).  
- Kitchen sections (Fridge, Freezer, Pantry, Spices).  

### **Phase 2 – Smart Management**  
- Expiration date tracking + notifications.  
- Basic recipe matching (% overlap between inventory and recipe ingredients).  

### **Phase 3 – Advanced Features (Stretch Goals)**  
- Receipt OCR → auto-add items from grocery receipts.  
- Recommendation system that prioritizes reducing waste.  
- Favorites and meal planning system.  

---

## 🛠️ Tech Stack (Proposed)  
- **Frontend**: React Native or Flutter (cross-platform mobile app).  
- **Backend**: Firebase or Node.js/Express (inventory, user data, notifications).  
- **Database**: Firestore / PostgreSQL.  
- **APIs/Datasets**: OpenFoodFacts API, Food.com Recipes Dataset.  
- **OCR**: Tesseract.js or Google Vision API (for receipt parsing).  

---

## 🌎 Why KitchenSync?  
Unlike generic recipe apps or inventory trackers, KitchenSync focuses on **reducing waste** by:  
- Making it **easy to add items** (barcode + receipt scanning).  
- Proactively **alerting users before food spoils**.  
- Recommending **recipes that use what’s already in your kitchen**.  

KitchenSync is where **convenience meets sustainability.**  

---

## 👥 Team  
University of Cincinnati – Senior Design Team  
- Drake Damron  
- Jason Welsh  
- Prashansa Dhakal  
- Brendan Swartz  
- Somyani Ghimire  
