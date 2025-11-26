// Expense Tracker Application - Main JavaScript File with Firebase Integration

// Firebase Configuration and Initialization
const firebaseConfig = {
  apiKey: "AIzaSyC6Dm2NgbSQnNeRP89PO1Ti8pQA1WMGEmE",
  authDomain: "expense-tracker-1d558.firebaseapp.com",
  projectId: "expense-tracker-1d558",
  storageBucket: "expense-tracker-1d558.firebasestorage.app",
  messagingSenderId: "328942814034",
  appId: "1:328942814034:web:198d13c76db909cfcd308b",
  measurementId: "G-R2SR6F1LY0"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const analytics = firebase.analytics();

// User Management Functions
class UserManager {
    static getCurrentUser() {
        return JSON.parse(sessionStorage.getItem('currentUser'));
    }

    static setCurrentUser(user) {
        sessionStorage.setItem('currentUser', JSON.stringify(user));
    }

    static logout() {
        auth.signOut().then(() => {
            sessionStorage.removeItem('currentUser');
            localStorage.removeItem('firebaseExpenseTransactions');
            window.location.href = 'login.html';
        }).catch((error) => {
            console.error('Logout error:', error);
            UIHelper.showNotification('Error during logout', 'error');
        });
    }

    static isLoggedIn() {
        return !!this.getCurrentUser();
    }
}

// Transaction Management Functions
class TransactionManager {
    static getTransactions() {
        const currentUser = UserManager.getCurrentUser();
        if (!currentUser) return [];
        
        const allTransactions = JSON.parse(localStorage.getItem('firebaseExpenseTransactions')) || [];
        return allTransactions.filter(transaction => transaction.userId === currentUser.uid);
    }

    static saveTransaction(transaction) {
        const transactions = JSON.parse(localStorage.getItem('firebaseExpenseTransactions')) || [];
        transaction.id = transaction.id || Date.now().toString();
        transaction.userId = UserManager.getCurrentUser().uid;
        transactions.push(transaction);
        localStorage.setItem('firebaseExpenseTransactions', JSON.stringify(transactions));
        return transaction;
    }

    static updateTransaction(updatedTransaction) {
        let transactions = JSON.parse(localStorage.getItem('firebaseExpenseTransactions')) || [];
        const index = transactions.findIndex(t => t.id === updatedTransaction.id);
        if (index !== -1) {
            transactions[index] = updatedTransaction;
            localStorage.setItem('firebaseExpenseTransactions', JSON.stringify(transactions));
            return true;
        }
        return false;
    }

    static deleteTransaction(id) {
        let transactions = JSON.parse(localStorage.getItem('firebaseExpenseTransactions')) || [];
        transactions = transactions.filter(transaction => transaction.id !== id);
        localStorage.setItem('firebaseExpenseTransactions', JSON.stringify(transactions));
    }

    static getTransactionById(id) {
        const transactions = JSON.parse(localStorage.getItem('firebaseExpenseTransactions')) || [];
        return transactions.find(transaction => transaction.id === id);
    }

    static calculateTotals(transactions) {
        let totalIncome = 0;
        let totalExpense = 0;

        transactions.forEach(transaction => {
            if (transaction.type === 'income') {
                totalIncome += parseFloat(transaction.amount);
            } else if (transaction.type === 'expense') {
                totalExpense += parseFloat(transaction.amount);
            }
        });

        const balance = totalIncome - totalExpense;

        return {
            totalIncome,
            totalExpense,
            balance
        };
    }

    static getCategories(type) {
        const categories = {
            income: ['Salary', 'Freelance', 'Investment', 'Gift', 'Bonus', 'Other Income'],
            expense: ['Food', 'Transportation', 'Entertainment', 'Utilities', 'Shopping', 'Healthcare', 'Education', 'Other Expense']
        };
        return categories[type] || [];
    }
}

// Authentication Functions with Firebase
class AuthManager {
    static async validateLogin(email, password) {
        if (!email || !password) {
            return { success: false, message: 'Please fill in all fields.' };
        }

        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            return { 
                success: true, 
                user: {
                    uid: user.uid,
                    email: user.email,
                    name: user.displayName || user.email.split('@')[0]
                }
            };
        } catch (error) {
            let message = 'An error occurred during login.';
            switch (error.code) {
                case 'auth/user-not-found':
                    message = 'No account found with this email.';
                    break;
                case 'auth/wrong-password':
                    message = 'Incorrect password.';
                    break;
                case 'auth/invalid-email':
                    message = 'Invalid email address.';
                    break;
                default:
                    message = error.message;
            }
            return { success: false, message };
        }
    }

    static async validateSignup(name, email, password, confirmPassword) {
        if (!name || !email || !password || !confirmPassword) {
            return { success: false, message: 'Please fill in all fields.' };
        }

        if (password !== confirmPassword) {
            return { success: false, message: 'Passwords do not match.' };
        }

        if (password.length < 6) {
            return { success: false, message: 'Password must be at least 6 characters.' };
        }

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Update profile with display name
            await user.updateProfile({
                displayName: name
            });

            return { 
                success: true,
                user: {
                    uid: user.uid,
                    email: user.email,
                    name: name
                }
            };
        } catch (error) {
            let message = 'An error occurred during sign up.';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    message = 'An account with this email already exists.';
                    break;
                case 'auth/invalid-email':
                    message = 'Invalid email address.';
                    break;
                case 'auth/weak-password':
                    message = 'Password is too weak.';
                    break;
                default:
                    message = error.message;
            }
            return { success: false, message };
        }
    }

    static async resetPassword(email) {
        if (!email) {
            return { success: false, message: 'Please enter your email address.' };
        }

        try {
            await auth.sendPasswordResetEmail(email);
            return { success: true, message: 'Password reset email sent successfully!' };
        } catch (error) {
            let message = 'Error sending password reset email.';
            switch (error.code) {
                case 'auth/user-not-found':
                    message = 'No account found with this email.';
                    break;
                case 'auth/invalid-email':
                    message = 'Invalid email address.';
                    break;
                default:
                    message = error.message;
            }
            return { success: false, message };
        }
    }
}

// UI Helper Functions
class UIHelper {
    static formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    static formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    }

    static showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'rgba(46, 204, 113, 0.9)' : 'rgba(231, 76, 60, 0.9)'};
            backdrop-filter: blur(20px);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 10000;
            font-weight: 500;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    static populateCategorySelect(selectElement, type) {
        const categories = TransactionManager.getCategories(type);
        selectElement.innerHTML = '<option value="">Select Category</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            selectElement.appendChild(option);
        });
    }

    static showLoading(button) {
        const originalText = button.innerHTML;
        button.innerHTML = '<div class="spinner"></div> Loading...';
        button.disabled = true;
        return originalText;
    }

    static hideLoading(button, originalText) {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// Page-Specific Initialization Functions
class PageManager {
    static initLoginPage() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const submitButton = this.querySelector('button[type="submit"]');
                
                const originalText = UIHelper.showLoading(submitButton);

                const result = await AuthManager.validateLogin(email, password);

                if (result.success) {
                    UserManager.setCurrentUser(result.user);
                    UIHelper.showNotification('Login successful!');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                } else {
                    UIHelper.showNotification(result.message, 'error');
                    UIHelper.hideLoading(submitButton, originalText);
                }
            });
        }

        // Forgot password functionality
        const forgotPasswordLink = document.getElementById('forgotPassword');
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', function(e) {
                e.preventDefault();
                const email = prompt('Please enter your email address to reset your password:');
                if (email) {
                    AuthManager.resetPassword(email).then(result => {
                        if (result.success) {
                            UIHelper.showNotification(result.message);
                        } else {
                            UIHelper.showNotification(result.message, 'error');
                        }
                    });
                }
            });
        }
    }

    static initSignupPage() {
        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.addEventListener('submit', async function(e) {
                e.preventDefault();

                const name = document.getElementById('name').value;
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                const submitButton = this.querySelector('button[type="submit"]');
                
                const originalText = UIHelper.showLoading(submitButton);

                const result = await AuthManager.validateSignup(name, email, password, confirmPassword);

                if (result.success) {
                    UserManager.setCurrentUser(result.user);
                    UIHelper.showNotification('Account created successfully!');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1500);
                } else {
                    UIHelper.showNotification(result.message, 'error');
                    UIHelper.hideLoading(submitButton, originalText);
                }
            });
        }
    }

    static initDashboardPage() {
        // Check authentication state
        auth.onAuthStateChanged((user) => {
            if (user) {
                const currentUser = {
                    uid: user.uid,
                    email: user.email,
                    name: user.displayName || user.email.split('@')[0]
                };
                UserManager.setCurrentUser(currentUser);
                document.querySelector('.user-name').textContent = currentUser.name;
                this.updateDashboardCards();
            } else {
                window.location.href = 'login.html';
            }
        });
        
        document.getElementById('logoutBtn').addEventListener('click', UserManager.logout);
    }

    static updateDashboardCards() {
        const transactions = TransactionManager.getTransactions();
        const totals = TransactionManager.calculateTotals(transactions);

        document.getElementById('totalIncome').textContent = UIHelper.formatCurrency(totals.totalIncome);
        document.getElementById('totalExpense').textContent = UIHelper.formatCurrency(totals.totalExpense);
        document.getElementById('currentBalance').textContent = UIHelper.formatCurrency(totals.balance);

        // Update balance color based on value
        const balanceElement = document.getElementById('currentBalance');
        if (totals.balance < 0) {
            balanceElement.style.color = '#e74c3c';
        } else {
            balanceElement.style.color = '#4a6cf7';
        }
    }

    static initAddTransactionPage(type) {
        // Check authentication state
        auth.onAuthStateChanged((user) => {
            if (!user) {
                window.location.href = 'login.html';
                return;
            }

            const currentUser = {
                uid: user.uid,
                email: user.email,
                name: user.displayName || user.email.split('@')[0]
            };
            UserManager.setCurrentUser(currentUser);
            
            const form = document.getElementById('transactionForm');
            const categorySelect = document.getElementById('category');
            
            UIHelper.populateCategorySelect(categorySelect, type);
            
            // Set today's date as default
            document.getElementById('date').valueAsDate = new Date();

            form.addEventListener('submit', function(e) {
                e.preventDefault();

                const amount = parseFloat(document.getElementById('amount').value);
                const category = document.getElementById('category').value;
                const date = document.getElementById('date').value;
                const note = document.getElementById('note').value;

                if (!amount || !category || !date) {
                    UIHelper.showNotification('Please fill in all required fields.', 'error');
                    return;
                }

                const transaction = {
                    type,
                    amount,
                    category,
                    date,
                    note
                };

                TransactionManager.saveTransaction(transaction);
                UIHelper.showNotification(`${type === 'income' ? 'Income' : 'Expense'} added successfully!`);
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            });
        });

        document.getElementById('logoutBtn').addEventListener('click', UserManager.logout);
    }

    static initHistoryPage() {
        // Check authentication state
        auth.onAuthStateChanged((user) => {
            if (!user) {
                window.location.href = 'login.html';
                return;
            }

            const currentUser = {
                uid: user.uid,
                email: user.email,
                name: user.displayName || user.email.split('@')[0]
            };
            UserManager.setCurrentUser(currentUser);
            
            this.displayTransactions();
            this.setupFilters();
        });
        
        document.getElementById('logoutBtn').addEventListener('click', UserManager.logout);
    }

    static displayTransactions(filteredTransactions = null) {
        const transactions = filteredTransactions || TransactionManager.getTransactions();
        const tbody = document.querySelector('#transactionsTable tbody');
        
        tbody.innerHTML = '';

        if (transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No transactions found.</td></tr>';
            return;
        }

        // Sort by date (newest first)
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            const amountClass = transaction.type === 'income' ? 'positive' : 'negative';
            const amountSign = transaction.type === 'income' ? '+' : '-';

            row.innerHTML = `
                <td>${UIHelper.formatDate(transaction.date)}</td>
                <td>${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}</td>
                <td>${transaction.category}</td>
                <td>${transaction.note || '-'}</td>
                <td class="${amountClass}">${amountSign}${UIHelper.formatCurrency(transaction.amount)}</td>
                <td>
                    <button class="btn-edit" data-id="${transaction.id}">Edit</button>
                    <button class="btn-delete" data-id="${transaction.id}">Delete</button>
                </td>
            `;

            tbody.appendChild(row);
        });

        // Add event listeners to action buttons
        document.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                PageManager.editTransaction(id);
            });
        });

        document.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                PageManager.deleteTransaction(id);
            });
        });
    }

    static setupFilters() {
        const typeFilter = document.getElementById('filterType');
        const categoryFilter = document.getElementById('filterCategory');
        const dateFromFilter = document.getElementById('filterDateFrom');
        const dateToFilter = document.getElementById('filterDateTo');

        // Populate category filter
        const categories = [...new Set(TransactionManager.getTransactions().map(t => t.category))];
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });

        // Add event listeners to filters
        [typeFilter, categoryFilter, dateFromFilter, dateToFilter].forEach(filter => {
            filter.addEventListener('change', () => PageManager.applyFilters());
        });
    }

    static applyFilters() {
        const typeFilter = document.getElementById('filterType').value;
        const categoryFilter = document.getElementById('filterCategory').value;
        const dateFromFilter = document.getElementById('filterDateFrom').value;
        const dateToFilter = document.getElementById('filterDateTo').value;

        const transactions = TransactionManager.getTransactions();

        const filteredTransactions = transactions.filter(transaction => {
            if (typeFilter && transaction.type !== typeFilter) return false;
            if (categoryFilter && transaction.category !== categoryFilter) return false;
            if (dateFromFilter && transaction.date < dateFromFilter) return false;
            if (dateToFilter && transaction.date > dateToFilter) return false;
            return true;
        });

        this.displayTransactions(filteredTransactions);
    }

    static editTransaction(id) {
        const transaction = TransactionManager.getTransactionById(id);
        if (!transaction) return;

        // In a real app, this would open a modal or redirect to an edit page
        // For now, we'll use prompts for simplicity
        const newAmount = prompt('Enter new amount:', transaction.amount);
        const newCategory = prompt('Enter new category:', transaction.category);
        const newNote = prompt('Enter new note:', transaction.note);

        if (newAmount && newCategory) {
            const updatedTransaction = {
                ...transaction,
                amount: parseFloat(newAmount),
                category: newCategory,
                note: newNote
            };

            if (TransactionManager.updateTransaction(updatedTransaction)) {
                UIHelper.showNotification('Transaction updated successfully!');
                this.displayTransactions();
                if (window.location.pathname.includes('dashboard.html')) {
                    this.updateDashboardCards();
                }
            }
        }
    }

    static deleteTransaction(id) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            TransactionManager.deleteTransaction(id);
            UIHelper.showNotification('Transaction deleted successfully!');
            this.displayTransactions();
            if (window.location.pathname.includes('dashboard.html')) {
                this.updateDashboardCards();
            }
        }
    }
}

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const path = window.location.pathname;
    
    if (path.includes('login.html')) {
        PageManager.initLoginPage();
    } else if (path.includes('signup.html')) {
        PageManager.initSignupPage();
    } else if (path.includes('dashboard.html')) {
        PageManager.initDashboardPage();
    } else if (path.includes('add-income.html')) {
        PageManager.initAddTransactionPage('income');
    } else if (path.includes('add-expense.html')) {
        PageManager.initAddTransactionPage('expense');
    } else if (path.includes('history.html')) {
        PageManager.initHistoryPage();
    }

    // Add active class to current page in navigation
    const currentPage = path.split('/').pop() || 'dashboard.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
});