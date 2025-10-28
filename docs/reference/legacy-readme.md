# 🧾 KitchenSync 🥫🥕  
A smart kitchen management **web application** to reduce food waste and make meal planning easier.  

This document serves as both a **README** and a **living project plan** for our team.  
Everyone should feel free to add, refine, or expand based on their area of focus.  

---

## 📌 Problem
Food waste is expensive, unsustainable, and preventable. Many households:
- Forget what food they already have  
- Let groceries expire before being used  
- Struggle to plan meals around what’s on hand  

**KitchenSync** addresses these challenges by helping users better visualize their kitchen, track what they own, and make smarter use of their food before it goes to waste.  

---

## 🗂️ App Overview
KitchenSync organizes your kitchen into simple, intuitive sections for easy management:
- **Fridge** – perishable items that expire quickly  
- **Freezer** – long-term frozen goods  
- **Pantry** – shelf-stable items  
- **Spice Rack** – long-lasting flavor essentials  

Each section ties into the app’s smart systems for expiration tracking, recommendations, and notifications.

---

## 🚀 Core Features

### 1️⃣ Receipt / Barcode Scanning
- Quickly add items via barcode lookup or receipt upload.  
- **Fallback:** Manual entry when an item isn’t recognized.  
- Uses external APIs for product metadata (e.g., OpenFoodFacts).  

> **Developer Note (Brendan):**  
> In a previous project, I built a Python scraper that collected candidate data from Ohio Board of Elections websites. When only PDFs were available, I successfully used **OpenAI’s ChatGPT API** for **vision-based OCR extraction**, which reliably returned structured JSON data.  
> This method could be explored as a potential OCR solution for KitchenSync, pending instructor approval.

---

### 2️⃣ Expiration Management
- Prompts users to add expiration dates during item entry or scan.  
- Expiration tracking is **optional**, but when added:
  - A reminder is sent **5 days before** an item expires.  
  - A follow-up alert is sent **on the expiration date** prompting deletion or confirmation.  

---

### 3️⃣ Lifestyle & Preferences Quiz
- Optional onboarding quiz to learn user tastes, dietary preferences, and cooking habits.  
- Inspired by Netflix’s “favorite shows” onboarding.  
- Helps **personalize recipe recommendations** and jump-start user engagement.  

---

## 🧠 Stretch Goals
If time and resources allow:
- **AI Integration:** Generate recipe suggestions, meal plans, and predictive shopping lists.  
- **Social Features:** Following chefs/creators, liking or sharing recipes, and profile pages.  
- **Mobile App:** Native version after web platform stabilization.

---

## 💡 Solution Approach

| **Phase** | **Goal** | **Core Deliverables** |
|------------|-----------|------------------------|
| **Phase 1 – MVP** | Core functionality | Manual entry, barcode scanning, expiration tracking |
| **Phase 2 – Smart Management** | Automation | Receipt OCR integration, lifestyle quiz, recipe linkage |
| **Phase 3 – Expansion** | Intelligence & reach | AI recipe recommendations, social layer, mobile app |

---

## 🧱 Architecture & Tech Stack (Tentative)

**Frontend:** React (Web-first)  
**Backend:** Node.js / Express or Firebase  
**Database:** Firestore, PostgreSQL, or similar (to be finalized by Prashansa)  
**OCR / AI:** OpenAI Vision API or Tesseract.js (pending approval)  
**Recipe Dataset:** [Food.com Recipes & Reviews](https://www.kaggle.com/datasets/irkaal/foodcom-recipes-and-reviews)  
**Product Metadata:** [OpenFoodFacts API](https://openfoodfacts.github.io/openfoodfacts-server/api/)  

---

## ⚖️ Ethical & Legal Considerations
- **Privacy:** Secure handling of user data (receipts, preferences, inventory).  
- **Licensing:** Compliance with open data and API usage terms.  
- **Food Safety:** Expiration tracking provides guidance, not guarantees.  
- **Transparency:** Distinguish curated vs. AI-generated content.  

---

## 👥 Team & Responsibilities  
**University of Cincinnati – Senior Design Team 14 (2025–2026)**

| **Member** | **Focus Area** | **Current Tasks** |
|-------------|----------------|--------------------|
| **Brendan Swartz** | Project Coordination & Documentation | Organize team materials, finalize README & project plan |
| **Prashansa Dhakal** | Database Research & Development | Research and outline data structure for items, expirations, and user profiles |
| **Somyani Ghimire** | UI/UX Design | Begin wireframing key pages (scanning, inventory list, alerts, quiz) |
| **Drake Damron** | Backend & Integration | Explore API and OCR integration options (OpenFoodFacts, ChatGPT Vision, etc.) |
| **Adama Ba** | TBD | Areas open for contribution: user account/auth flow, notification systems, or recipe dataset handling |

---

## 🗓️ Next Steps
- [ ] Finalize database design proposal (Prashansa)  
- [ ] Develop initial UI wireframes (Somyani)  
- [ ] Research OCR API feasibility (Drake + Brendan)  
- [ ] Confirm with instructors regarding OpenAI Vision API use (Brendan)  
- [ ] Define MVP feature scope for Fall semester deliverables  

---

## 🧭 Project Goals
- Reduce household food waste through smarter tracking and planning.  
- Leverage AI and automation responsibly to improve everyday sustainability.  
- Deliver a functional, intuitive web application prototype by the end of the academic year.  
