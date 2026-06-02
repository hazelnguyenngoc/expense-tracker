from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import mysql.connector
from datetime import date
import os
import shutil
import uuid

app = FastAPI()

# Serve frontend static files (CSS, JS) from the frontend/static directory
app.mount("/static", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "../frontend/static")), name="static")

# Serve uploaded receipts from the backend/uploads directory
app.mount("/uploads", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "uploads")), name="uploads")

# Automatically create the receipts folder if it doesn't exist yet
RECEIPTS_DIR = os.path.join(os.path.dirname(__file__), "uploads", "receipts")
os.makedirs(RECEIPTS_DIR, exist_ok=True)

# Database connection - returns a new connection for each request (closed after use)
def get_db():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="021111",
        database="expense_tracker"
    )

# Pydantic model for expense data validation
# Ensures all required fields are present and correctly typed
class Expense(BaseModel):
    title: str
    category: str
    amount: float
    date: date
    description: Optional[str] = ""

# Serve the main HTML page at the root URL
@app.get("/")
def read_root():
    return FileResponse(os.path.join(os.path.dirname(__file__), "../frontend/index.html"))


# GET all expenses - return all records ordered by date (newest first)
@app.get("/expenses")
def get_expenses():
    db = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM expenses ORDER BY date DESC")
        expenses = cursor.fetchall()
        cursor.close()
        return expenses
    except Exception as e:
        raise HTTPException(status_code=500, detail="Could not fetch expenses. Please try again later.")
    finally:
        if db:
            db.close()


# POST — create a new expense with optional receipt upload
@app.post("/expenses")
async def create_expense(
    title: str = Form(...),
    category: str = Form(...),
    amount: float = Form(...),
    date: str = Form(...),
    description: str = Form(""),
    receipt: Optional[UploadFile] = File(None)
):
    receipt_path = None

    if receipt and receipt.filename:
        ext = os.path.splitext(receipt.filename)[1]
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(RECEIPTS_DIR, unique_filename)
        with open(file_path, "wb") as f:
            shutil.copyfileobj(receipt.file, f)
        receipt_path = f"/uploads/receipts/{unique_filename}"

    db = None
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            "INSERT INTO expenses (title, category, amount, date, description, receipt_path) VALUES (%s, %s, %s, %s, %s, %s)",
            (title, category, float(amount), date, description, receipt_path)
        )
        db.commit()
        new_id = cursor.lastrowid
        cursor.close()
        return {"id": new_id, "title": title, "category": category, "amount": amount, "date": date, "description": description, "receipt_path": receipt_path}
    except Exception as e:
        # Clean up the uploaded file if the DB insert failed
        if receipt_path:
            full_path = os.path.join(RECEIPTS_DIR, os.path.basename(receipt_path))
            if os.path.exists(full_path):
                os.remove(full_path)
        raise HTTPException(status_code=500, detail="Could not save expense. Please try again later.")
    finally:
        if db:
            db.close()

# PUT — update an existing expense by ID
# Keeps the existing receipt if no new file is uploaded
# Pass delete_receipt=true to remove the existing receipt without replacing it
@app.put("/expenses/{expense_id}")
async def update_expense(
    expense_id: int,
    title: str = Form(...),
    category: str = Form(...),
    amount: float = Form(...),
    date: str = Form(...),
    description: str = Form(""),
    receipt: Optional[UploadFile] = File(None),
    delete_receipt: str = Form("false")
):
    db = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute("SELECT receipt_path FROM expenses WHERE id=%s", (expense_id,))
        existing = cursor.fetchone()

        if not existing:
            cursor.close()
            raise HTTPException(status_code=404, detail="Expense not found")

        receipt_path = existing["receipt_path"]
        cursor.close()

        if receipt and receipt.filename:
            if receipt_path:
                old_file = os.path.join(RECEIPTS_DIR, os.path.basename(receipt_path))
                if os.path.exists(old_file):
                    os.remove(old_file)

            ext = os.path.splitext(receipt.filename)[1]
            unique_filename = f"{uuid.uuid4().hex}{ext}"
            file_path = os.path.join(RECEIPTS_DIR, unique_filename)
            with open(file_path, "wb") as f:
                shutil.copyfileobj(receipt.file, f)
            receipt_path = f"/uploads/receipts/{unique_filename}"
        elif delete_receipt == "true" and receipt_path:
            old_file = os.path.join(RECEIPTS_DIR, os.path.basename(receipt_path))
            if os.path.exists(old_file):
                os.remove(old_file)
            receipt_path = None

        cursor2 = db.cursor()
        cursor2.execute(
            "UPDATE expenses SET title=%s, category=%s, amount=%s, date=%s, description=%s, receipt_path=%s WHERE id=%s",
            (title, category, float(amount), date, description, receipt_path, expense_id)
        )
        db.commit()
        cursor2.close()
        return {"id": expense_id, "title": title, "category": category, "amount": amount, "date": date, "description": description, "receipt_path": receipt_path}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Could not update expense. Please try again later.")
    finally:
        if db:
            db.close()

# DELETE — remove an expense and its associated receipt file from disk
@app.delete("/expenses/{expense_id}")
def delete_expense(expense_id: int):
    db = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute("SELECT receipt_path FROM expenses WHERE id=%s", (expense_id,))
        existing = cursor.fetchone()

        if not existing:
            cursor.close()
            raise HTTPException(status_code=404, detail="Expense not found")

        if existing["receipt_path"]:
            file_path = os.path.join(RECEIPTS_DIR, os.path.basename(existing["receipt_path"]))
            if os.path.exists(file_path):
                os.remove(file_path)

        cursor.close()
        cursor2 = db.cursor()
        cursor2.execute("DELETE FROM expenses WHERE id=%s", (expense_id,))
        db.commit()
        cursor2.close()
        return {"message": "Expense deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Could not delete expense. Please try again later.")
    finally:
        if db:
            db.close()
