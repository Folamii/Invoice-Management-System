const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const invoicesDir = path.join(__dirname, 'invoices');
fs.mkdir(invoicesDir, { recursive: true }).catch(console.error);

async function readItems() {
    try {
        const data = await fs.readFile(path.join(__dirname, 'data', 'items.json'), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading items:', error);
        return [];
    }
}

function calculateInvoice(items) {
    let subtotal = 0;
    items.forEach(item => {
        subtotal += item.price * item.quantity;
    });
    
    const taxRate = 0.10;
    const taxAmount = subtotal * taxRate;
    
    let shippingCost = 0;
    const totalBeforeDiscount = subtotal + taxAmount;
    
    if (totalBeforeDiscount < 500) {
        shippingCost = totalBeforeDiscount * 0.05;
    } else if (totalBeforeDiscount < 750) {
        shippingCost = totalBeforeDiscount * 0.03;
    } else if (totalBeforeDiscount < 1000) {
        shippingCost = totalBeforeDiscount * 0.01;
    }
    
    const totalWithShipping = totalBeforeDiscount + shippingCost;
    let discountAmount = 0;
    const discountRate = 0.10;
    
    if (totalWithShipping >= 1000) {
        discountAmount = totalWithShipping * discountRate;
    }
    
    const total = totalWithShipping - discountAmount;
    
    return {
        subtotal: parseFloat(subtotal.toFixed(2)),
        taxRate: taxRate * 100,
        taxAmount: parseFloat(taxAmount.toFixed(2)),
        shippingCost: parseFloat(shippingCost.toFixed(2)),
        discountRate: discountAmount > 0 ? discountRate * 100 : 0,
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        total: parseFloat(total.toFixed(2))
    };
}

app.get('/api/items', async (req, res) => {
    try {
        const items = await readItems();
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load items' });
    }
});

app.post('/api/invoice', async (req, res) => {
    try {
        const { items } = req.body;
        
        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'No items in cart' });
        }
        
        const allItems = await readItems();
        const invoiceItems = items.map(cartItem => {
            const itemDetails = allItems.find(i => i.id === cartItem.id);
            return {
                ...itemDetails,
                quantity: cartItem.quantity,
                totalPrice: parseFloat((itemDetails.price * cartItem.quantity).toFixed(2))
            };
        });
        
        const totals = calculateInvoice(invoiceItems);
        
        const invoiceData = {
            invoiceNumber: `INV-${Date.now()}`,
            date: new Date().toISOString(),
            items: invoiceItems,
            ...totals
        };
        
        let csvContent = 'Invoice Number,Date\n';
        csvContent += `${invoiceData.invoiceNumber},${new Date(invoiceData.date).toLocaleDateString()}\n\n`;
        csvContent += 'Item,Description,Price,Quantity,Total\n';
        invoiceData.items.forEach(item => {
            csvContent += `"${item.name}","${item.description}",${item.price},${item.quantity},${item.totalPrice}\n`;
        });
        csvContent += '\n';
        csvContent += `Subtotal,$${invoiceData.subtotal}\n`;
        csvContent += `Tax (${invoiceData.taxRate}%),$${invoiceData.taxAmount}\n`;
        csvContent += `Shipping,$${invoiceData.shippingCost}\n`;
        if (invoiceData.discountAmount > 0) {
            csvContent += `Discount (${invoiceData.discountRate}%),-$${invoiceData.discountAmount}\n`;
        }
        csvContent += `Total,$${invoiceData.total}\n`;
        
        const filename = `${invoiceData.invoiceNumber}.csv`;
        await fs.writeFile(path.join(invoicesDir, filename), csvContent);
        
        res.json({
            success: true,
            invoice: invoiceData,
            filename: filename
        });
        
    } catch (error) {
        console.error('Error processing invoice:', error);
        res.status(500).json({ error: 'Failed to process invoice' });
    }
});

app.get('/api/invoice/download/:filename', async (req, res) => {
    try {
        const filepath = path.join(invoicesDir, req.params.filename);
        res.download(filepath);
    } catch (error) {
        res.status(404).json({ error: 'Invoice not found' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});