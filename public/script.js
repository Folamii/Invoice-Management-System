let availableItems = [];
let invoiceItems = [];
let currentInvoice = null;

const itemSelect = document.getElementById('itemSelect');
const quantityInput = document.getElementById('quantity');
const addItemBtn = document.getElementById('addItemBtn');
const invoiceItemsList = document.getElementById('invoiceItemsList');
const invoiceSummary = document.getElementById('invoiceSummary');
const finalizeBtn = document.getElementById('finalizeBtn');
const finalInvoice = document.getElementById('finalInvoice');
const invoiceContent = document.getElementById('invoiceContent');
const downloadBtn = document.getElementById('downloadBtn');
const newInvoiceBtn = document.getElementById('newInvoiceBtn');

document.addEventListener('DOMContentLoaded', () => {
    loadItems();
    setupEventListeners();
});

async function loadItems() {
    try {
        const response = await fetch('/api/items');
        availableItems = await response.json();
        availableItems.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = `${item.name} - $${item.price.toFixed(2)}`;
            itemSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading items:', error);
    }
}

function setupEventListeners() {
    addItemBtn.addEventListener('click', addItem);
    finalizeBtn.addEventListener('click', finalizeOrder);
    downloadBtn.addEventListener('click', downloadInvoice);
    newInvoiceBtn.addEventListener('click', resetInvoice);
}

function addItem() {
    const selectedId = parseInt(itemSelect.value);
    const quantity = parseInt(quantityInput.value);
    
    if (!selectedId) { alert('Please select an item'); return; }
    if (quantity < 1) { alert('Quantity must be at least 1'); return; }
    
    const item = availableItems.find(i => i.id === selectedId);
    const existingItem = invoiceItems.find(i => i.id === selectedId);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        invoiceItems.push({ ...item, quantity: quantity });
    }
    
    itemSelect.value = '';
    quantityInput.value = 1;
    updateInvoiceList();
    updateSummary();
}

function updateInvoiceList() {
    if (invoiceItems.length === 0) {
        invoiceItemsList.innerHTML = '<p class="empty-message">No items added yet</p>';
        invoiceSummary.style.display = 'none';
        return;
    }
    invoiceItemsList.innerHTML = '';
    invoiceItems.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'invoice-item';
        itemDiv.innerHTML = `
            <div class="invoice-item-info">
                <div class="invoice-item-name">${item.name}</div>
                <div class="invoice-item-details">$${item.price.toFixed(2)} × ${item.quantity} = $${(item.price * item.quantity).toFixed(2)}</div>
            </div>
            <button class="remove-btn" onclick="removeItem(${index})">Remove</button>
        `;
        invoiceItemsList.appendChild(itemDiv);
    });
}

window.removeItem = function(index) {
    invoiceItems.splice(index, 1);
    updateInvoiceList();
    updateSummary();
}

function updateSummary() {
    if (invoiceItems.length === 0) { invoiceSummary.style.display = 'none'; return; }
    invoiceSummary.style.display = 'block';
    
    const subtotal = invoiceItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxRate = 0.10;
    const taxAmount = subtotal * taxRate;
    const totalBeforeDiscount = subtotal + taxAmount;
    
    let shippingCost = 0;
    if (totalBeforeDiscount < 500) shippingCost = totalBeforeDiscount * 0.05;
    else if (totalBeforeDiscount < 750) shippingCost = totalBeforeDiscount * 0.03;
    else if (totalBeforeDiscount < 1000) shippingCost = totalBeforeDiscount * 0.01;
    
    const totalWithShipping = totalBeforeDiscount + shippingCost;
    let discountAmount = totalWithShipping >= 1000 ? totalWithShipping * 0.10 : 0;
    const total = totalWithShipping - discountAmount;
    
    document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('taxAmount').textContent = `$${taxAmount.toFixed(2)}`;
    document.getElementById('shippingCost').textContent = `$${shippingCost.toFixed(2)}`;
    
    if (discountAmount > 0) {
        document.getElementById('discountRow').style.display = 'flex';
        document.getElementById('discountAmount').textContent = `-$${discountAmount.toFixed(2)}`;
    } else {
        document.getElementById('discountRow').style.display = 'none';
    }
    document.getElementById('totalAmount').textContent = `$${total.toFixed(2)}`;
}

async function finalizeOrder() {
    if (invoiceItems.length === 0) { alert('Please add items'); return; }
    try {
        const response = await fetch('/api/invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: invoiceItems.map(item => ({ id: item.id, quantity: item.quantity })) })
        });
        const result = await response.json();
        
        if (result.success) {
            currentInvoice = result.invoice;
            displayFinalInvoice(result.invoice);
            document.querySelector('.item-selection').style.display = 'none';
            document.querySelector('.invoice-items').style.display = 'none';
            invoiceSummary.style.display = 'none';
            finalInvoice.style.display = 'block';
        }
    } catch (error) { alert('Failed to process invoice'); }
}

function displayFinalInvoice(invoice) {
    let html = `
        <div style="text-align:center; margin-bottom: 20px;">
            <h3 style="color:#667eea;">INVOICE</h3>
            <p>Invoice Number: ${invoice.invoiceNumber}</p>
            <p>Date: ${new Date(invoice.date).toLocaleDateString()}</p>
        </div>
        <table class="invoice-table">
            <thead><tr><th>Item</th><th>Price</th><th>Qty</th><th>Total</th></tr></thead>
            <tbody>
    `;
    invoice.items.forEach(item => {
        html += `<tr><td>${item.name}</td><td>$${item.price.toFixed(2)}</td><td>${item.quantity}</td><td>$${item.totalPrice.toFixed(2)}</td></tr>`;
    });
    html += `
            </tbody>
        </table>
        <div class="summary-details">
            <div class="summary-row"><span>Subtotal:</span><span>$${invoice.subtotal.toFixed(2)}</span></div>
            <div class="summary-row"><span>Tax (${invoice.taxRate}%):</span><span>$${invoice.taxAmount.toFixed(2)}</span></div>
            <div class="summary-row"><span>Shipping:</span><span>$${invoice.shippingCost.toFixed(2)}</span></div>
    `;
    if (invoice.discountAmount > 0) {
        html += `<div class="summary-row" style="color: #48bb78;"><span>Discount (${invoice.discountRate}%):</span><span>-$${invoice.discountAmount.toFixed(2)}</span></div>`;
    }
    html += `<div class="summary-row total-row"><span>Total:</span><span>$${invoice.total.toFixed(2)}</span></div></div>`;
    invoiceContent.innerHTML = html;
}

function downloadInvoice() {
    if (currentInvoice) window.location.href = `/api/invoice/download/${currentInvoice.invoiceNumber}.csv`;
}

function resetInvoice() {
    invoiceItems = [];
    currentInvoice = null;
    document.querySelector('.item-selection').style.display = 'block';
    document.querySelector('.invoice-items').style.display = 'block';
    finalInvoice.style.display = 'none';
    invoiceSummary.style.display = 'none';
    updateInvoiceList();
}