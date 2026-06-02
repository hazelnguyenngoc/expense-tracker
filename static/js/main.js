// ===== APPLICATION STATE =====
// These variables hold the current state of the app in memory
// allExpenses stores the full list fetched from the backend
// editingId tracks which expense is currently being edited in the modal
// isDarkMode tracks whether dark mode is currently active
let allExpenses = [];
let editingId = null;
let isDarkMode = false;

// ===== CATEGORY COLORS =====
// Maps each category name to a colour used in the chart legend
const categoryColors = {
    'Rent':          '#8FA4A9',
    'Electricity':   '#E8C96A',
    'Internet':      '#6A9EB5',
    'Groceries':     '#7BBF72',
    'Eating Out':    '#EFE095',
    'Leisure':       '#C4A0E0',
    'Transport':     '#E08080',
    'Uncategorized': '#9A9880'
};

// ===== SANITIZE INPUT =====
// Prevents XSS attacks by converting special characters like < and > into
// their safe HTML equivalents before inserting user input into the page
// Uses a temporary div that never gets added to the DOM
function sanitize(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// ===== CATEGORY CSS CLASS MAP =====
// Returns the CSS class name for a given category
// Used to apply the correct colour styling to each category tag
function getCategoryClass(category) {
    const map = {
        'Rent': 'cat-rent',
        'Electricity': 'cat-electricity',
        'Internet': 'cat-internet',
        'Groceries': 'cat-groceries',
        'Eating Out': 'cat-eating-out',
        'Leisure': 'cat-leisure',
        'Transport': 'cat-transport',
        'Uncategorized': 'cat-uncategorized'
    };
    return map[category] || 'cat-uncategorized';
}

// ===== IMAGE FILE CHECK =====
// Returns true if the file path points to an image file
// Used to decide whether to show a thumbnail or a file icon in the expense list
function isImageFile(path) {
    if (!path) return false;
    return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(path);
}

// ===== ON PAGE LOAD =====
// Runs all initialisation functions when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    setDefaultDate();
    fetchExpenses();
    setHeaderDate();
    setupFileInputListeners();
    loadDarkModePreference();
});

// Sets the date input to today's date using local time (not UTC)
// This avoids timezone issues where toISOString() returns yesterday's date
function setDefaultDate() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('date').value = `${yyyy}-${mm}-${dd}`;
}

// Displays the current month and year in the header
function setHeaderDate() {
    const now = new Date();
    const label = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    document.getElementById('headerDate').textContent = label;
}

// ===== FILE INPUT LABEL UPDATERS =====
// Updates the visible file label text when a file is selected
// Also validates file size — rejects files larger than 5MB
function setupFileInputListeners() {
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB in bytes

    document.getElementById('receipt').addEventListener('change', function() {
        const label = document.getElementById('fileLabel');
        if (this.files && this.files[0]) {
            if (this.files[0].size > MAX_SIZE) {
                showToast('File too large! Maximum size is 5MB.', 'error');
                this.value = '';
                label.textContent = 'Choose a file...';
                label.classList.remove('has-file');
                return;
            }
            label.textContent = this.files[0].name;
            label.classList.add('has-file');
        } else {
            label.textContent = 'Choose a file...';
            label.classList.remove('has-file');
        }
    });

    document.getElementById('editReceipt').addEventListener('change', function() {
        const label = document.getElementById('editFileLabel');
        if (this.files && this.files[0]) {
            if (this.files[0].size > MAX_SIZE) {
                showToast('File too large! Maximum size is 5MB.', 'error');
                this.value = '';
                label.textContent = 'Choose a file...';
                label.classList.remove('has-file');
                return;
            }
            label.textContent = this.files[0].name;
            label.classList.add('has-file');
        } else {
            label.textContent = 'Choose a file...';
            label.classList.remove('has-file');
        }
    });
}

// ===== DARK MODE =====
// Toggles dark mode on/off by adding/removing the 'dark' class on the body
// Saves the preference to localStorage so it persists across page refreshes
function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark', isDarkMode);
    document.getElementById('darkToggle').textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
    localStorage.setItem('darkMode', isDarkMode);
}

// Checks localStorage on page load and restores the user's dark mode preference
function loadDarkModePreference() {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') {
        isDarkMode = true;
        document.body.classList.add('dark');
        document.getElementById('darkToggle').textContent = 'Light Mode';
    }
}

// ===== SCROLL TO TOP =====
// Smoothly scrolls the page back to the top when the button is clicked
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== FETCH ALL EXPENSES =====
// Fetches all expenses from the backend API and updates the UI
// Shows a loading message while fetching and an error message if the request fails
async function fetchExpenses() {
    document.getElementById('expenseList').innerHTML = '<p class="loading-message">Loading...</p>';

    try {
        const response = await fetch('/expenses');
        allExpenses = await response.json();
        renderExpenses(allExpenses);
        updateSummary(allExpenses);
    } catch (error) {
        console.log(error);
        document.getElementById('expenseList').innerHTML = '<p class="empty-message">Failed to load expenses. Please refresh.</p>';
        showToast('Failed to load expenses', 'error');
    }
}

// ===== RENDER EXPENSE LIST =====
// Builds and inserts the HTML for the expense list into the DOM
// Each expense shows its category, title, date, amount, receipt thumbnail, and action buttons
function renderExpenses(expenses) {
    const list = document.getElementById('expenseList');

    if (expenses.length === 0) {
        list.innerHTML = '<p class="empty-message">No expenses yet. Add one above!</p>';
        return;
    }

    list.innerHTML = expenses.map(exp => {
        // Build receipt thumbnail — image thumbnail for images, file icon for other files
        let receiptHTML = `<div class="no-receipt"></div>`;
        if (exp.receipt_path) {
            if (isImageFile(exp.receipt_path)) {
                receiptHTML = `<img class="receipt-thumb" src="${exp.receipt_path}" alt="Receipt for ${sanitize(exp.title)}" loading="lazy" onclick="openLightbox('${exp.receipt_path}', true)">`;
            } else {
                receiptHTML = `<div class="receipt-file-icon" onclick="openLightbox('${exp.receipt_path}', false, '${exp.receipt_path.split('/').pop()}')">📄</div>`;
            }
        }

        return `
        <div class="expense-item" id="expense-${exp.id}">
            <span class="expense-category-tag ${getCategoryClass(exp.category)}">${sanitize(exp.category)}</span>
            <div class="expense-item-amount-row">
                <div class="expense-item-amount-row-left">
                    <span class="expense-title">${sanitize(exp.title)}</span>
                    <span class="expense-meta">${sanitize(exp.date)}${exp.description ? ' · ' + sanitize(exp.description) : ''}</span>
                </div>
                <div class="expense-item-amount-row-right">
                    <div class="expense-amount">$${parseFloat(exp.amount).toFixed(2)}</div>
                    ${receiptHTML}
                </div>
            </div>
            <div class="expense-actions">
                <button class="btn-edit" onclick="openEditModal(${exp.id})">Edit</button>
                <button class="btn-delete" onclick="deleteExpense(${exp.id})">Delete</button>
            </div>
        </div>
        `;
    }).join('');
}

// ===== FILTER EXPENSES =====
// Filters the displayed expenses by category and/or search keyword
// Both filters work together — results must match both conditions
function filterExpenses() {
    const filter = document.getElementById('filterCategory').value;
    const search = document.getElementById('searchInput').value.trim().toLowerCase();

    let filtered = allExpenses;

    // Apply category filter first
    if (filter !== 'All') {
        filtered = filtered.filter(exp => exp.category === filter);
    }

    // Then narrow down by search keyword
    if (search) {
        filtered = filtered.filter(exp => exp.title.toLowerCase().includes(search));
    }

    renderExpenses(filtered);
}

// ===== ADD EXPENSE =====
// Validates the form, then sends a POST request to create a new expense
// Uses FormData instead of JSON to support optional file uploads
async function addExpense() {
    const title = document.getElementById('title').value.trim();
    const category = document.getElementById('category').value;
    const amount = document.getElementById('amount').value;
    const date = document.getElementById('date').value;
    const description = document.getElementById('description').value.trim();
    const receiptFile = document.getElementById('receipt').files[0];

    // Validate required fields
    if (!title || !amount || !date) {
        showToast('Please fill in title, amount and date!', 'error');
        return;
    }

    // Validate amount is a positive number
    if (parseFloat(amount) <= 0) {
        showToast('Amount must be greater than zero!', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('category', category);
    formData.append('amount', parseFloat(amount));
    formData.append('date', date);
    formData.append('description', description);
    if (receiptFile) {
        formData.append('receipt', receiptFile);
    }

    try {
        const response = await fetch('/expenses', {
            method: 'POST',
            body: formData
        });

    if (response.ok) {
        clearForm();
        fetchExpenses();
        showToast('Expense added!');
    } else {
        const err = await response.json();
        showToast(err.detail || 'Failed to add expense', 'error');
    }
    } catch (error) {
        showToast('Failed to add expense', 'error');
    }
}

// ===== CLEAR FORM =====
// Resets all form fields back to their default values after a successful submission
function clearForm() {
    document.getElementById('title').value = '';
    document.getElementById('amount').value = '';
    document.getElementById('description').value = '';
    document.getElementById('category').value = 'Rent';
    document.getElementById('receipt').value = '';
    document.getElementById('fileLabel').textContent = 'Choose a file...';
    document.getElementById('fileLabel').classList.remove('has-file');
    setDefaultDate();
}

// ===== DELETE EXPENSE =====
// Shows a custom confirmation dialog before deleting
// If confirmed, animates the item out then sends a DELETE request to the backend
async function deleteExpense(id) {
    const expense = allExpenses.find(exp => exp.id === id);

    openConfirm(`Are you sure you want to delete "${expense.title}"?`, async () => {
        const item = document.getElementById(`expense-${id}`);
        item.style.animation = 'slideOut 0.25s ease forwards';

        setTimeout(async () => {
            try {
                const response = await fetch(`/expenses/${id}`, { method: 'DELETE' });
                if (response.ok) {
                    fetchExpenses();
                    showToast('Expense deleted');
                }
            } catch (error) {
                showToast('Failed to delete expense', 'error');
            }
        }, 250);
    });
}

// ===== CONFIRM DIALOG =====
// Opens a custom styled confirmation dialog with a dynamic message
// onConfirm is a callback function that runs only if the user clicks Delete
function openConfirm(message, onConfirm) {
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmOverlay').classList.add('active');
    document.getElementById('confirmDeleteBtn').onclick = () => {
        closeConfirm();
        onConfirm();
    };
}

// Closes the confirmation dialog
function closeConfirm() {
    document.getElementById('confirmOverlay').classList.remove('active');
}

// ===== EDIT MODAL =====
// Opens the edit modal and pre-fills all fields with the selected expense's data
function openEditModal(id) {
    const expense = allExpenses.find(exp => exp.id === id);
    if (!expense) return;

    editingId = id;
    document.getElementById('editTitle').value = expense.title;
    document.getElementById('editCategory').value = expense.category;
    document.getElementById('editAmount').value = expense.amount;
    document.getElementById('editDate').value = expense.date;
    document.getElementById('editDescription').value = expense.description || '';

    // Reset the file input so it doesn't show a previously selected file
    document.getElementById('editReceipt').value = '';
    document.getElementById('editFileLabel').textContent = 'Choose a file...';
    document.getElementById('editFileLabel').classList.remove('has-file');

    // Show the current receipt filename as a hint
    const hint = document.getElementById('currentReceiptHint');
    hint.textContent = expense.receipt_path
        ? `Current: ${expense.receipt_path.split('/').pop()}`
        : 'No picture attached';

    document.getElementById('modalOverlay').classList.add('active');
}

// Closes the edit modal and clears the editing state
function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    editingId = null;
}

// Close modal when clicking outside the modal box
document.getElementById('modalOverlay').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

// ===== SAVE EDIT =====
// Validates the edit form then sends a PUT request to update the expense
// Keeps the existing receipt if no new file is selected
async function saveEdit() {
    const title = document.getElementById('editTitle').value.trim();
    const category = document.getElementById('editCategory').value;
    const amount = document.getElementById('editAmount').value;
    const date = document.getElementById('editDate').value;
    const description = document.getElementById('editDescription').value.trim();
    const receiptFile = document.getElementById('editReceipt').files[0];

    // Validate required fields
    if (!title || !amount || !date) {
        showToast('Please fill in all required fields!', 'error');
        return;
    }

    // Validate amount is a positive number
    if (parseFloat(amount) <= 0) {
        showToast('Amount must be greater than zero!', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('category', category);
    formData.append('amount', parseFloat(amount));
    formData.append('date', date);
    formData.append('description', description);
    if (receiptFile) {
        formData.append('receipt', receiptFile);
    }

    try {
        const response = await fetch(`/expenses/${editingId}`, {
            method: 'PUT',
            body: formData
        });

        if (response.ok) {
            closeModal();
            fetchExpenses();
            showToast('Expense updated!');
        } else {
            const err = await response.json();
            showToast(err.detail || 'Failed to update expense', 'error');
        }
    } catch (error) {
        showToast('Failed to update expense', 'error');
    }
}

// ===== UPDATE SUMMARY =====
// Calculates and displays the current month's total spending
// Then updates both the bar chart and category legend
function updateSummary(expenses) {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthlyTotal = expenses
        .filter(exp => exp.date.substring(0, 7) === currentMonth)
        .reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    document.getElementById('totalAmount').textContent = `$${monthlyTotal.toFixed(2)}`;

    updateBarChart(expenses);
    updateCategoryLegend(expenses);
}

// ===== FLAT BAR CHART =====
// Renders a simple horizontal bar chart showing monthly spending totals
// Highlights the current month's bar in a darker colour
// Only shows the last 6 months to keep the chart readable
function updateBarChart(expenses) {
    const container = document.getElementById('barChartContainer');

    if (expenses.length === 0) {
        container.innerHTML = '<p style="font-size:0.75rem;color:#9A9880;font-style:italic;text-align:center;padding:10px 0;">No data yet</p>';
        return;
    }

    // Group expenses by month
    const monthlyTotals = {};
    expenses.forEach(exp => {
        const month = exp.date.substring(0, 7);
        monthlyTotals[month] = (monthlyTotals[month] || 0) + parseFloat(exp.amount);
    });

    const sortedMonths = Object.keys(monthlyTotals).sort().slice(-6);
    const maxVal = Math.max(...sortedMonths.map(m => monthlyTotals[m]));
    const currentMonth = new Date().toISOString().substring(0, 7);

    // Build bar width as a percentage of the highest month's total
    container.innerHTML = sortedMonths.map(month => {
        const [year, m] = month.split('-');
        const label = new Date(year, m - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
        const pct = maxVal > 0 ? (monthlyTotals[month] / maxVal) * 100 : 0;
        const isCurrent = month === currentMonth;
        return `
            <div class="bar-row">
                <span class="bar-month">${label}</span>
                <div class="bar-track">
                    <div class="bar-fill ${isCurrent ? 'current' : ''}" style="width:${pct}%"></div>
                </div>
                <span class="bar-value">$${monthlyTotals[month].toFixed(0)}</span>
            </div>
        `;
    }).join('');
}

// ===== CATEGORY LEGEND =====
// Renders a colour-coded list of spending totals by category
// Sorted from highest to lowest so the biggest expenses are always at the top
function updateCategoryLegend(expenses) {
    const container = document.getElementById('categoryLegend');

    if (expenses.length === 0) {
        container.innerHTML = '<p class="legend-empty">No data yet</p>';
        return;
    }

    // Sum spending per category
    const categoryTotals = {};
    expenses.forEach(exp => {
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + parseFloat(exp.amount);
    });

    const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

    container.innerHTML = sorted.map(([cat, total]) => `
        <div class="legend-row">
            <div class="legend-dot" style="background:${categoryColors[cat] || '#9A9880'}"></div>
            <span class="legend-label">${cat}</span>
            <span class="legend-value">$${total.toFixed(2)}</span>
        </div>
    `).join('');
}

// ===== LIGHTBOX =====
// Opens a fullscreen overlay to display a receipt image or file download link
// isImage determines whether to show an image or a download button
function openLightbox(path, isImage, filename = '') {
    const overlay = document.getElementById('lightboxOverlay');
    const img = document.getElementById('lightboxImg');
    const fileDiv = document.getElementById('lightboxFile');
    const filenameEl = document.getElementById('lightboxFilename');
    const downloadLink = document.getElementById('lightboxDownload');

    if (isImage) {
        img.src = path;
        img.style.display = 'block';
        fileDiv.style.display = 'none';
    } else {
        img.style.display = 'none';
        fileDiv.style.display = 'flex';
        fileDiv.style.flexDirection = 'column';
        fileDiv.style.alignItems = 'center';
        fileDiv.style.gap = '12px';
        filenameEl.textContent = filename;
        downloadLink.href = path;
        downloadLink.download = filename;
    }

    overlay.classList.add('active');
}

// Closes the lightbox and clears the image source to free memory
function closeLightbox() {
    document.getElementById('lightboxOverlay').classList.remove('active');
    document.getElementById('lightboxImg').src = '';
}

// ===== TOAST NOTIFICATION =====
// Displays a brief notification message at the bottom right of the screen
// type can be 'success' (default) or 'error' which changes the background colour
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type === 'error' ? 'error' : ''} show`;
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}