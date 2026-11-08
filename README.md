# Invoice Management System

A full-stack web application that lets a user pick items, set quantities, and generate an invoice with calculated tax, shipping, and discounts. Finished invoices are saved on the server as CSV files and can be downloaded from the browser.

Built as a class project for a Web Applications course.

## Features

- Item list loaded from a JSON file and shown in a dropdown menu
- Add items to an order by choosing a quantity; remove items before finalizing
- Live invoice summary (subtotal, tax, shipping, discount, total) that updates as items change
- Finalize the order to display the full invoice details
- Each invoice is saved to the server as a CSV file and can be downloaded
- Server-side validation (an empty order is rejected)

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js with Express.js
- **Data:** JSON (item catalog) and CSV (saved invoices)

## Getting Started

You need [Node.js](https://nodejs.org/) installed.

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Open the app in your browser
# http://localhost:3000
```

For development with automatic restarts, use `npm run dev` (uses nodemon).

## How Invoices Are Calculated

| Item | Rule |
| --- | --- |
| Subtotal | Sum of price x quantity for every item |
| Tax | 10% of the subtotal |
| Shipping | Based on subtotal + tax: 5% under $500, 3% under $750, 1% under $1,000, free at $1,000 or more |
| Discount | 10% off when the total (including tax and shipping) is $1,000 or more |
| Total | Subtotal + tax + shipping - discount |

## Project Structure

```
invoice-management-system/
├── data/
│   └── items.json        # Item catalog
├── invoices/             # Generated invoice CSV files are saved here
├── public/
│   ├── index.html        # Page layout
│   ├── script.js         # Frontend logic
│   └── styles.css        # Styling
├── server.js             # Express server and API routes
└── package.json
```

## API Routes

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/items` | Returns the item catalog |
| POST | `/api/invoice` | Calculates totals, saves the invoice as a CSV, and returns the invoice |
| GET | `/api/invoice/download/:filename` | Downloads a saved invoice CSV |
