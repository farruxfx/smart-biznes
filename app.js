/**
 * Smart Business Assistant - Core Application Logic
 * Vanilla JS, No Dependencies
 */

const app = (function () {

    // --- State Management ---
    const STATE = {
        transactions: [],
        customers: [],
        debts: [],
        settings: {
            businessName: "My Business",
            currency: "UZS"
        }
    };

    // --- Persistence Service ---
    const Storage = {
        save: () => {
            localStorage.setItem('sba_data', JSON.stringify(STATE));
        },
        load: () => {
            const data = localStorage.getItem('sba_data');
            if (data) {
                const parsed = JSON.parse(data);
                STATE.transactions = parsed.transactions || [];
                STATE.customers = parsed.customers || [];
                STATE.debts = parsed.debts || [];
                STATE.settings = { ...STATE.settings, ...parsed.settings };
            } else {
                // Initialize with Demo Data if empty
                Storage.seedDemoData();
            }
        },
        seedDemoData: () => {
            STATE.customers = [
                { id: 'c1', name: 'Alice Freeman', phone: '+123456789', tag: 'VIP' },
                { id: 'c2', name: 'Bob Smith', phone: '+987654321', tag: 'Regular' }
            ];
            STATE.transactions = [
                { id: 't1', type: 'income', amount: 150000, category: 'Sales', date: new Date().toISOString().split('T')[0], note: 'Morning sales' },
                { id: 't2', type: 'expense', amount: 50000, category: 'Supplies', date: new Date().toISOString().split('T')[0], note: 'Paper purchase' }
            ];
            STATE.debts = [
                { id: 'd1', customerId: 'c2', amount: 25000, date: '2025-12-01', note: 'Unpaid service' }
            ];
            Storage.save();
        },
        reset: () => {
            localStorage.clear();
            location.reload();
        }
    };

    // --- Helpers ---
    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => document.querySelectorAll(selector);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: STATE.settings.currency,
            minimumFractionDigits: 0
        }).format(amount);
    };

    const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

    // --- UI Renderers ---
    const Renderer = {
        renderDashboard: () => {
            const today = new Date().toISOString().split('T')[0];

            // Calc Metrics
            const todayTrans = STATE.transactions.filter(t => t.date === today);
            const income = todayTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
            const expense = todayTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
            const totalBalance = STATE.transactions.reduce((sum, t) => sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
            const overdueCount = STATE.debts.length; // Simplified logic

            // Update DOM
            $('#dash-income').textContent = formatCurrency(income);
            $('#dash-expense').textContent = formatCurrency(expense);
            $('#dash-balance').textContent = formatCurrency(totalBalance);
            $('#dash-overdue').textContent = overdueCount;

            // Render Recent Activity
            const list = $('#dash-activity-list');
            list.innerHTML = '';
            const recent = [...STATE.transactions].reverse().slice(0, 5);

            if (recent.length === 0) list.innerHTML = '<li class="empty-state">No activity yet</li>';

            recent.forEach(t => {
                const li = document.createElement('li');
                li.className = 'activity-item';
                li.innerHTML = `
                    <div class="activity-left">
                        <div class="activity-icon">
                            <span class="material-icons-round">${t.type === 'income' ? 'arrow_downward' : 'arrow_upward'}</span>
                        </div>
                        <div class="activity-details">
                            <h4>${t.category}</h4>
                            <p>${t.date} • ${t.note || ''}</p>
                        </div>
                    </div>
                    <div class="activity-amount ${t.type}">
                        ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
                    </div>
                `;
                list.appendChild(li);
            });
        },

        renderTransactions: () => {
            const tbody = $('#transaction-list');
            tbody.innerHTML = '';
            STATE.transactions.forEach(t => {
                const tr = document.createElement('tr');
                const customerName = t.customerId ? (STATE.customers.find(c => c.id === t.customerId)?.name || 'Unknown') : '-';
                tr.innerHTML = `
                    <td>${t.date}</td>
                    <td>${t.category}</td>
                    <td>${customerName}</td>
                    <td>${t.note || ''}</td>
                    <td style="color: ${t.type === 'income' ? 'var(--success)' : 'var(--danger)'}; font-weight:600;">
                        ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
                    </td>
                    <td>
                        <button class="icon-btn" onclick="app.deleteTransaction('${t.id}')">
                            <span class="material-icons-round">delete</span>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        },

        renderCustomers: () => {
            const grid = $('#customer-list');
            grid.innerHTML = '';
            STATE.customers.forEach(c => {
                const card = document.createElement('div');
                card.className = 'customer-card';
                card.innerHTML = `
                    <div class="customer-header">
                        <div class="customer-avatar">${c.name.charAt(0)}</div>
                        <span class="tag ${c.tag.toLowerCase()}">${c.tag}</span>
                    </div>
                    <h4>${c.name}</h4>
                    <p style="color:var(--text-secondary); font-size: 0.9rem; margin-top:0.25rem;">${c.phone}</p>
                    <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                         <button class="secondary-btn" style="padding: 0.5rem; flex:1;" onclick="app.openSMS('${c.name}')">
                            <span class="material-icons-round" style="font-size:16px">message</span> SMS
                         </button>
                    </div>
                `;
                grid.appendChild(card);
            });

            // Populate Dropdowns
            const options = `<option value="">Select Customer...</option>` +
                STATE.customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

            $('#trans-customer').innerHTML = options;
            $('#debt-customer').innerHTML = options;
        },

        renderDebts: () => {
            const tbody = $('#debt-list');
            tbody.innerHTML = '';
            STATE.debts.forEach(d => {
                const c = STATE.customers.find(cx => cx.id === d.customerId);
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${c ? c.name : 'Unknown'}</td>
                    <td style="font-weight:600">${formatCurrency(d.amount)}</td>
                    <td>${d.date}</td>
                    <td><span class="tag debtor">Unpaid</span></td>
                    <td>
                        <button class="icon-btn" onclick="app.solveDebt('${d.id}')">
                            <span class="material-icons-round">check_circle</span>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        },

        renderSettings: () => {
            $('#setting-business-name').value = STATE.settings.businessName;
            $('#setting-currency').value = STATE.settings.currency;
        }
    };

    // --- Application Logic ---
    const Logic = {
        switchView: (viewId) => {
            // Update UI Links
            $$('.nav-item').forEach(el => el.classList.remove('active'));
            $$(`.nav-item[data-view="${viewId}"]`).forEach(el => el.classList.add('active'));

            // Update Sections
            $$('.view').forEach(el => el.classList.remove('active-view'));
            $(`#view-${viewId}`).classList.add('active-view');

            // Refresh Data
            Logic.refreshAll();
        },

        refreshAll: () => {
            Renderer.renderDashboard();
            Renderer.renderTransactions();
            Renderer.renderCustomers();
            Renderer.renderDebts();
            Renderer.renderSettings();
        },

        // CRUD
        saveTransaction: () => {
            const form = $('#form-transaction');
            const data = {
                id: generateId(),
                type: form.querySelector('input[name="trans-type"]:checked').value,
                amount: $('#trans-amount').value,
                category: $('#trans-category').value,
                date: $('#trans-date').value,
                customerId: $('#trans-customer').value,
                note: $('#trans-note').value
            };

            STATE.transactions.push(data);
            Storage.save();
            Logic.closeModal('modal-transaction');
            form.reset();
            UI.showToast('Transaction added', 'success');
            Logic.refreshAll();
        },

        deleteTransaction: (id) => {
            if (!confirm('Delete this transaction?')) return;
            STATE.transactions = STATE.transactions.filter(t => t.id !== id);
            Storage.save();
            Logic.refreshAll();
            UI.showToast('Transaction deleted', 'info');
        },

        saveCustomer: () => {
            const form = $('#form-customer');
            const data = {
                id: generateId(),
                name: $('#cust-name').value,
                phone: $('#cust-phone').value,
                tag: $('#cust-tag').value
            };
            STATE.customers.push(data);
            Storage.save();
            Logic.closeModal('modal-customer');
            form.reset();
            UI.showToast('Customer saved', 'success');
            Logic.refreshAll();
        },

        saveDebt: () => {
            const form = $('#form-debt');
            const data = {
                id: generateId(),
                customerId: $('#debt-customer').value,
                amount: $('#debt-amount').value,
                date: $('#debt-date').value,
                note: $('#debt-note').value
            };
            STATE.debts.push(data);
            Storage.save();
            Logic.closeModal('modal-debt');
            form.reset();
            UI.showToast('Debt recorded', 'warning');
            Logic.refreshAll();
        },

        solveDebt: (id) => {
            if (!confirm('Mark this debt as paid?')) return;
            STATE.debts = STATE.debts.filter(d => d.id !== id);
            Storage.save();
            Logic.refreshAll();
            UI.showToast('Debt marked as paid', 'success');
        },

        // Settings
        saveSettings: () => {
            STATE.settings.businessName = $('#setting-business-name').value;
            STATE.settings.currency = $('#setting-currency').value;
            Storage.save();
            Logic.refreshAll();
            UI.showToast('Settings saved', 'success');
        },

        exportData: () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(STATE));
            const el = document.createElement('a');
            el.setAttribute("href", dataStr);
            el.setAttribute("download", "smartbiz_backup.json");
            document.body.appendChild(el);
            el.click();
            el.remove();
        },

        // Mock AI
        askAI: (query) => {
            if (!query) query = $('#ai-input').value;
            if (!query) return;

            // Add User Msg
            Logic.addChatMsg(query, 'user');
            $('#ai-input').value = '';

            // Simulate Thinking
            setTimeout(() => {
                let response = "I'm not sure about that.";
                const qLower = query.toLowerCase();

                if (qLower.includes('profit')) {
                    const profit = STATE.transactions.reduce((acc, t) => acc + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
                    response = `Your current total profit/balance is **${formatCurrency(profit)}**. Keep it up!`;
                } else if (qLower.includes('customer')) {
                    response = `You have **${STATE.customers.length} customers**. Your top customer is Alice Freeman.`;
                } else if (qLower.includes('sms') || qLower.includes('draft')) {
                    response = "Here is a draft: 'Hello {name}, we missed you! Come back for 20% off.'";
                } else {
                    response = "I can help with finance analysis, customer insights, and marketing drafts. Try asking 'How much did I make today?'";
                }

                Logic.addChatMsg(response, 'ai');
            }, 1000);
        },

        addChatMsg: (text, type) => {
            const history = $('#chat-history');
            const div = document.createElement('div');
            div.className = `chat-msg ${type}`;
            div.innerHTML = `<div class="msg-content">${text}</div>`;
            history.appendChild(div);
            history.scrollTop = history.scrollHeight;
        },

        sendSMS: () => {
            const template = $('#sms-template').value;
            const msg = $('#sms-message').value;
            if (!msg) return alert('Please write a message');

            UI.showToast(`Simulated sending to all users...`, 'info');
            // Mock clear
            setTimeout(() => UI.showToast('Campaign successfully sent!', 'success'), 1500);
        },

        loadTemplate: (type) => {
            const templates = {
                'promo': 'Hello {name}! We have a special offer just for you. Visit us today!',
                'reminder': 'Dear {name}, this is a friendly reminder about your balance.'
            };
            if (templates[type]) $('#sms-message').value = templates[type];
        },

        // Modals
        openModal: (id, params = {}) => {
            $(`#${id}`).classList.add('open');
            if (id === 'modal-transaction' && params.type) {
                // Pre-select type
                const radios = document.getElementsByName('trans-type');
                radios.forEach(r => {
                    if (r.value === params.type) r.checked = true;
                });
            }
        },
        closeModal: (id) => {
            $(`#${id}`).classList.remove('open');
        }
    };

    // --- UI Utilities ---
    const UI = {
        showToast: (msg, type = 'info') => {
            const container = $('#toast-container');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `<span class="material-icons-round">${type === 'success' ? 'check_circle' : 'info'}</span> ${msg}`;
            container.appendChild(toast);
            setTimeout(() => {
                toast.style.animation = 'slideInRight 0.3s reverse forwards';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    };

    // --- Initialization ---
    const init = () => {
        Storage.load();

        // Navigation Events
        $$('.nav-item[data-view]').forEach(el => {
            el.addEventListener('click', () => {
                const view = el.getAttribute('data-view');
                Logic.switchView(view);
            });
        });

        // Initial Render
        Logic.refreshAll();

        // Set default date inputs to today
        const today = new Date().toISOString().split('T')[0];
        if ($('#trans-date')) $('#trans-date').value = today;
        if ($('#debt-date')) $('#debt-date').value = today;
    };

    return {
        init,
        switchView: Logic.switchView,
        openModal: Logic.openModal,
        closeModal: Logic.closeModal,
        saveTransaction: Logic.saveTransaction,
        deleteTransaction: Logic.deleteTransaction,
        saveCustomer: Logic.saveCustomer,
        saveDebt: Logic.saveDebt,
        solveDebt: Logic.solveDebt,
        saveSettings: Logic.saveSettings,
        resetData: Storage.reset,
        exportData: Logic.exportData,
        askAI: Logic.askAI,
        handleChatInput: (e) => { if (e.key === 'Enter') Logic.askAI(); },
        sendChat: () => Logic.askAI(),
        loadTemplate: Logic.loadTemplate,
        sendSMS: Logic.sendSMS,
        openSMS: (name) => {
            Logic.switchView('sms');
            $('#sms-message').value = `Hello ${name}, `;
        }
    };

})();

// Start App
document.addEventListener('DOMContentLoaded', app.init);
