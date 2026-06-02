# 🧾 My Expense Tracker

Many people, especially those who are anxious about money, struggle to track their daily spending and often wonder where their money goes. This application provides a simple and intuitive way to log expenses, attach receipt pictures for reference, and review spending patterns over time. The minimalist design aims to reduce friction and present only what is necessary, making the habit of tracking easier to maintain. Through monthly summaries and category breakdowns, users can gain awareness of their spending habits and work towards healthier financial decisions.

---

## Features

- Add, edit, and delete expenses
- Upload receipts or pictures for each expense
- Filter expenses by category
- Search expenses by title
- Monthly spending summary
- Spending breakdown by category
- Dark mode toggle
- Mobile responsive design


---

## Tech Stack

| Layer         | Technology                    |
|---------------|-------------------------------|
| Backend       | FastAPI (Python)              |
| Database      | MySQL                         |
| Frontend      | HTML, CSS, JavaScript         |
| Font          | IBM Plex Mono (Google Fonts)  |
| File Uploads  | python-multipart              |

---

## Project Structure
expense-tracker/
├── main.py              # FastAPI backend - all API endpoints
├── index.html           # Main HTML page
├── requirements.txt     # Python dependencies
├── static/
│   ├── css/
│   │   └── style.css    # All styles including dark mode and responsive
│   ├── js/
│   │   └── main.js      # Frontend logic - fetch, render, filter, charts
│   └── receipts/        # Uploaded receipt files (auto-created)

---

## Setup Instructions

### Prerequisites
- Python 3.10+
- MySQL Server

### 1. Create and activate virtual environment
bash
python -m venv .venv
.venv\Scripts\activate


### 2. Install dependencies
bash
pip install -r requirements.txt


### 3. Set up the database
Open MySQL Workbench and run:
sql
CREATE DATABASE expense_tracker;
USE expense_tracker;

CREATE TABLE expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    description VARCHAR(500),
    receipt_path VARCHAR(255)
);


### 5. Run the server
bash
python -m uvicorn main:app --reload


### 6. Open in browser
http://127.0.0.1:8000/


---

## API Endpoints

| Method            | Endpoint          | Description           |
|-------------------|-------------------|-----------------------|
| GET               | `/expenses`       | Get all expenses      |
| POST              | `/expenses`       | Create a new expense  |
| PUT               | `/expenses/{id}`  | Update an expense     |
| DELETE            | `/expenses/{id}`  | Delete an expense     |

---

## Categories

- 🏠 Rent
- 💡 Electricity
- 🌐 Internet
- 🛒 Groceries
- 🍜 Eating Out
- 🎮 Leisure
- 🚗 Transport
- ❓ Uncategorized

---

## Limitations and Future Improvements
- Currently, category selection is predefined. Future iterations will include a customization feature, allowing users the flexibility to create and manage categories tailored to their specific needs.
- Media Management: The current version does not support the permanent deletion of attached images, however, users can modify expense entries and replace existing files or images as needed.
- There are known edge cases where Google Fonts may not render consistently across all environments.
- Given the current project scope and my evolving proficiency with the tech stack, the architecture is relatively straightforward. Future versions would benefit from a more robust framework like React + Vite to improve performance and code maintainability.

Improvement
1. No try/except blocks around any DB calls in main.pyLinks to an external site.. If MySQL is down, the server throws an unhandled 500 with a raw Python traceback, no user-friendly error message.
2. On the frontend, fetch calls in main.js have no .catch() handlers for network failures. If the API is unreachable, the UI silently does nothing, the expense list stays blank with no feedback to the user.

## Future Roadmap
- Budgeting Integration: While originally considered, a comprehensive budgeting suite was deferred to avoid scope creep. Future updates will include benchmarking features to help users track spending against their income.
- Gamification: To increase user engagement, I plan to introduce interactive elements—such as a "growth" mechanic where consistent saving milestones are represented by a digital tree.
- Code Refinement: I intend to further modularize the file structure to improve clarity and scalability, ensuring the codebase is organized according to industry best practices.


## Author

Ngoc Thanh Hien (Hazel) Nguyen - Student ID: 25655174  
Subject: 32516 Internet Programming - Autumn 2026  
Institution: University of Technology Sydney