# 🧧 QR-Based Chinese New Year Lucky Spin System

A lightweight web-based lucky spin system built for a real Chinese restaurant during a Chinese New Year promotion.

Customers scan a QR code, spin a festive wheel, and instantly receive prizes.
The system was designed for real-world usage under live customer interaction.

## 📌 Overview

This project focuses on:

Fair and controlled prize distribution

One-device-per-activity participation restriction

Smooth spin animation using Canvas

Mobile-first responsive design

Simple deployment and maintenance

The system was successfully used in a live restaurant environment.

## 🛠 Tech Stack

Python (Flask)

HTML / CSS

JavaScript (Canvas animation)

LocalStorage for participation control

## ✨ Features
🎡 Weighted Random Prize Logic

Prize probability is controlled via weight configuration:
```
random.choices(names, weights=weights, k=1)[0]
```
Example configuration:
```
const PRIZES = [
  { name: "Free Mango Pomelo Sago", weight: 33 },
  { name: "Free Soft Drink", weight: 33 },
  { name: "Free CNY Sweet Rice Cake", weight: 33 }
];
```

## 🎨 UI & Animation

Red & Gold festive theme

Smooth easing rotation animation

Pointer correction logic

Celebration effect on the win

Fully responsive for mobile devices

## 🚀 Running Locally

Clone the repository:
```
git clone https://github.com/OrcasJi/REPO_NAME.git
cd REPO_NAME
```
Install dependencies:
```
pip install flask
```
Run:
```
python app.py
```


## 📂 Project Structure
```
project-root/
│
├── app.py
├── templates/
│   └── index.html
├── static/
│   ├── style.css
│   └── script.js
└── README.md
```

## 🎯 Real-World Context

9 restaurant tables

~26 guests capacity

One participation per table

Controlled prize cost using weighted logic

The focus was reliability, fairness, and simplicity.

## 📈 Future Improvements

Server-side logging (database)

Admin dashboard

Participation analytics

Cloud deployment

Multi-language support

---
## 👨‍💻 Author

Hongli Ji
