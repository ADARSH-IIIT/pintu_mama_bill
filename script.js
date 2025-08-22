// Global variables
let medicalItems = [
    {
        qty: 3,
        productName: 'TELMA',
        batchNo: '18240211',
        expiry: 'Feb-27',
        mrp: 227.14,
        discount: 0
    }
];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Set current date and time if not already set
    const now = new Date();
    // Always set current date & time on load; user can edit after
    document.getElementById('billDate').value = now.toISOString().split('T')[0];
    document.getElementById('billTime').value = now.toTimeString().split(' ')[0].substring(0, 5);
    
    // Load store details from localStorage (or save current defaults if none)
    loadStoreDetails();
    
    // Initial render
    renderMedicalItems();
    
    // Add event listeners for real-time updates
    addEventListeners();
    
    // Initial bill preview update
    setTimeout(() => {
        updateBillPreview();
    }, 100);
});

// Add event listeners for real-time updates
function addEventListeners() {
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.addEventListener('input', debounce(updateBillPreview, 300));
        input.addEventListener('change', debounce(updateBillPreview, 300));
    });

    // Persist store details when any of those fields change
    const persistStoreDetailsDebounced = debounce(persistStoreDetails, 300);
    if (typeof STORE_FIELDS !== 'undefined') {
        STORE_FIELDS.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', persistStoreDetailsDebounced);
                el.addEventListener('change', persistStoreDetailsDebounced);
                el.addEventListener('blur', persistStoreDetailsDebounced);
            }
        });
    }

    // Force uppercase on Store Details fields only
    if (typeof UPPERCASE_FIELDS !== 'undefined') {
        UPPERCASE_FIELDS.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const toUpper = () => {
                    const pos = el.selectionStart;
                    el.value = String(el.value).toUpperCase();
                    try { el.setSelectionRange(pos, pos); } catch (_) {}
                };
                el.addEventListener('input', toUpper);
                el.addEventListener('blur', toUpper);
                el.addEventListener('change', toUpper);
            }
        });
    }

    // Ctrl+S to save/update
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveBill();
        }
    });
}

// Debounce function to limit API calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Local storage persistence for store details
const STORE_FIELDS = ['storeName', 'storeAddress', 'storeSubtitle', 'jurisdiction', 'dlNumber', 'gstNumber'];
// Only store detail fields should be uppercased
const UPPERCASE_FIELDS = [...STORE_FIELDS];

function loadStoreDetails() {
    try {
        const saved = localStorage.getItem('storeDetails');
        if (saved) {
            const data = JSON.parse(saved);
            STORE_FIELDS.forEach(id => {
                if (data && Object.prototype.hasOwnProperty.call(data, id)) {
                    const el = document.getElementById(id);
                    if (el) el.value = data[id];
                }
            });
        } else {
            // First visit: persist current defaults
            persistStoreDetails();
        }
    } catch (e) {
        console.warn('Failed to load store details from localStorage:', e);
    }
}

function persistStoreDetails() {
    try {
        const data = {};
        STORE_FIELDS.forEach(id => {
            const el = document.getElementById(id);
            data[id] = el ? el.value : '';
        });
        localStorage.setItem('storeDetails', JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to save store details to localStorage:', e);
    }
}

// Add new medical item
function addMedicalItem() {
    medicalItems.push({
        qty: 1,
        productName: '',
        batchNo: '',
        expiry: '',
        mrp: 0,
        discount: 0
    });
    renderMedicalItems();
    updateBillPreview();
}

// Remove medical item
function removeMedicalItem(index) {
    medicalItems.splice(index, 1);
    renderMedicalItems();
    updateBillPreview();
}

// Render medical items in the form
function renderMedicalItems() {
    const container = document.getElementById('medicalItemsList');
    container.innerHTML = '';

    // Add header row
    const headerDiv = document.createElement('div');
    headerDiv.className = 'medical-item item-header';
    headerDiv.innerHTML = `
        <div>Qty</div>
        <div>Product Name</div>
        <div>Batch No</div>
        <div>Expiry</div>
        <div>MRP</div>
        <div>Disc %</div>
        <div>Amount</div>
        <div>Action</div>
    `;
    container.appendChild(headerDiv);

    medicalItems.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'medical-item';
        
        const itemTotal = item.qty * item.mrp;
        
        itemDiv.innerHTML = `
            <input type="number" value="${item.qty}" min="1" 
                   oninput="handleInputChange(${index}, 'qty', this)" onblur="updateMedicalItem(${index}, 'qty', this.value)" style="width: 100%;">
            <input type="text" value="${item.productName}" placeholder="Product Name"
                   oninput="handleInputChange(${index}, 'productName', this)" onblur="updateMedicalItem(${index}, 'productName', this.value)" style="width: 100%;">
            <input type="text" value="${item.batchNo}" placeholder="Batch No"
                   oninput="handleInputChange(${index}, 'batchNo', this)" onblur="updateMedicalItem(${index}, 'batchNo', this.value)">
            <input type="text" value="${item.expiry}" placeholder="Expiry"
                   oninput="handleInputChange(${index}, 'expiry', this)" onblur="updateMedicalItem(${index}, 'expiry', this.value)">
            <input type="text" value="${item.mrp}" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" placeholder="MRP"
                   oninput="handleInputChange(${index}, 'mrp', this)" onblur="updateMedicalItem(${index}, 'mrp', this.value)">
            <input type="text" value="${item.discount}" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" placeholder="Disc %"
                   oninput="handleInputChange(${index}, 'discount', this)" onblur="updateMedicalItem(${index}, 'discount', this.value)" style="width: 100%;">
            <div class="item-amount">₹${itemTotal.toFixed(2)}</div>
            <button type="button" class="btn btn-danger" style="padding: 8px 12px; font-size: 11px;"
                    onclick="removeMedicalItem(${index})">Remove</button>
        `;
        container.appendChild(itemDiv);
    });
}

// Handle input changes without immediate re-render
function handleInputChange(index, field, input) {
    const value = input.value;
    if (field === 'qty' || field === 'mrp' || field === 'discount') {
        const normalized = String(value).replace(',', '.');
        medicalItems[index][field] = parseFloat(normalized) || 0;
    } else {
        // Do not force uppercase for item text fields
        medicalItems[index][field] = value;
        input.value = value;
    }
    // Update the display value in the input without re-rendering
    // numeric fields already updated
}

// Update medical item data on blur
function updateMedicalItem(index, field, value) {
    if (field === 'qty' || field === 'mrp' || field === 'discount') {
        const normalized = String(value).replace(',', '.');
        medicalItems[index][field] = parseFloat(normalized) || 0;
    } else {
        // Keep item text as typed
        medicalItems[index][field] = value;
    }
    renderMedicalItems(); // Re-render only on blur
    updateBillPreview();
}

// Calculate grand total with auto-round off
function calculateGrandTotal() {
    const subtotal = medicalItems.reduce((sum, item) => sum + (item.qty * item.mrp), 0);
    const totalDiscount = medicalItems.reduce((sum, item) => sum + (item.qty * item.mrp * item.discount / 100), 0);
    const afterDiscount = subtotal - totalDiscount;
    const cashDiscount = parseFloat(document.getElementById('cashDiscount').value) || 0;
    let totalBeforeRound = afterDiscount - cashDiscount;
    const roundOff = (totalBeforeRound % 1).toFixed(3); // Auto-calculate round off
    const total = Math.floor(totalBeforeRound); // Remove decimal part

    document.getElementById('roundOff').value = roundOff;

    return {
        subtotal: subtotal,
        totalDiscount: totalDiscount,
        afterDiscount: afterDiscount,
        cashDiscount: cashDiscount,
        roundOff: parseFloat(roundOff),
        total: total
    };
}

// Update bill preview
function updateBillPreview() {
    const preview = document.getElementById('billPreview');
    const totals = calculateGrandTotal();
    const jurisdiction = document.getElementById('jurisdiction').value || 'Bhopal';
    
    const billContent = `
        <div class="bill-header">
            <div class="store-name">${document.getElementById('storeName').value}</div>
            <div class="store-address">${document.getElementById('storeAddress').value.replace(/\n/g, '<br>')}</div>
            <div class="store-address">${document.getElementById('storeSubtitle').value}</div>
            <div class="store-address">D.L. NO. ${document.getElementById('dlNumber').value}</div>
            ${document.getElementById('gstNumber').value ? `<div class="store-address">GST NO: ${document.getElementById('gstNumber').value}</div>` : ''}
        </div>
        
        <div class="bill-info">
            <div>
                <strong>TO:</strong><br>
                ${document.getElementById('customerName').value}<br>
                ${document.getElementById('customerAddress').value.replace(/\n/g, '<br>')}
                <br><br>
                <strong>PRES. BY:</strong> ${document.getElementById('prescribedBy').value}
            </div>
            <div style="text-align: right;">
                <strong>BILL NO.:</strong> ${document.getElementById('billNumber').value}<br>
                <strong>BILL DATE:</strong> ${formatDate(document.getElementById('billDate').value)}<br>
                <strong>BILL TIME:</strong> ${document.getElementById('billTime').value}
            </div>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th>S.N</th>
                    <th>QTY</th>
                    <th>PRODUCT</th>
                    <th>BATCH NO</th>
                    <th>EXP</th>
                    <th>MRP</th>
                    <th>DISC %</th>
                    <th>AMOUNT</th>
                </tr>
            </thead>
            <tbody>
                ${medicalItems.map((item, index) => `
                    <tr>
                        <td style="text-align: center;">${index + 1}</td>
                        <td class="number-col">${item.qty}</td>
                        <td>${item.productName}</td>
                        <td style="text-align: center;">${item.batchNo}</td>
                        <td style="text-align: center;">${item.expiry}</td>
                        <td class="number-col">${item.mrp.toFixed(2)}</td>
                        <td class="number-col">${item.discount.toFixed(1)}%</td>
                        <td class="number-col">${(item.qty * item.mrp).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="bill-total">
            <div class="total-line">
                <span><strong>SUBTOTAL:</strong></span>
                <span><strong>${totals.subtotal.toFixed(2)}</strong></span>
            </div>
            <div class="total-line">
                <span><strong>DISCOUNT:</strong></span>
                <span><strong>${totals.totalDiscount.toFixed(2)}</strong></span>
            </div>
            <div class="total-line">
                <span><strong>AFTER DISCOUNT:</strong></span>
                <span><strong>${totals.afterDiscount.toFixed(2)}</strong></span>
            </div>
            <div class="total-line">
                <span><strong>CASH DISC:</strong></span>
                <span><strong>${totals.cashDiscount.toFixed(2)}</strong></span>
            </div>
            <div class="total-line">
                <span><strong>ROUND OFF:</strong></span>
                <span><strong>${totals.roundOff.toFixed(3)}</strong></span>
            </div>
            <div class="total-line" style="border-top: 2px solid #000; padding-top: 10px; font-size: 14px;">
                <span><strong>PLEASE PAY:</strong></span>
                <span><strong>₹${totals.total.toFixed(2)}</strong></span>
            </div>
        </div>

        <div style="text-align: center; margin: 20px 0; font-weight: bold;">
            RS. ${numberToWords(Math.round(totals.total)).toUpperCase()} ONLY
        </div>

        <div class="bill-footer">
            All Medicines subject to ${jurisdiction} Jurisdiction only<br>
            Price Inclusive of all taxes<br><br>
            <div style="text-align: right; margin-top: 20px;">
                ISSUED BY :  ${document.getElementById('storeName').value}
            </div>
        </div>
    `;
    
    preview.innerHTML = billContent;
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
}

// Convert number to words
function numberToWords(num) {
    if (num === 0) return 'zero';
    
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    
    function convertHundreds(n) {
        let result = '';
        if (n >= 100) {
            result += ones[Math.floor(n / 100)] + ' hundred ';
            n %= 100;
        }
        if (n >= 20) {
            result += tens[Math.floor(n / 10)] + ' ';
            n %= 10;
        }
        if (n >= 10) {
            result += teens[n - 10] + ' ';
            n = 0;
        }
        if (n > 0) {
            result += ones[n] + ' ';
        }
        return result;
    }
    
    if (num < 1000) {
        return convertHundreds(num).trim();
    }
    
    // Handle thousands
    let result = '';
    if (num >= 100000) {
        result += convertHundreds(Math.floor(num / 100000)) + 'lakh ';
        num %= 100000;
    }
    if (num >= 1000) {
        result += convertHundreds(Math.floor(num / 1000)) + 'thousand ';
        num %= 1000;
    }
    result += convertHundreds(num);
    
    return result.trim();
}

// Save bill function
function saveBill() {
    const indicator = document.getElementById('saveIndicator');
    indicator.classList.add('show');
    // Also persist store details on save
    try { persistStoreDetails(); } catch (e) { /* noop */ }
    setTimeout(() => {
        indicator.classList.remove('show');
    }, 2000);
}

// Generate bill function
function generateBill() {
    updateBillPreview();
    saveBill();
}

// Print bill function
function printBill() {
    const printContent = document.getElementById('billPreview').innerHTML;
    const customerNameRaw = (document.getElementById('customerName').value || 'BILL').trim();
    const billDate = (document.getElementById('billDate').value || '').trim();
    const billTime = (document.getElementById('billTime').value || '').trim();
    const sanitize = (s) => s
        .replace(/\s+/g, '_')
        .replace(/[^A-Za-z0-9._-]/g, '')
        .replace(/_+/g, '_')
        .substring(0, 80);
    const namePart = sanitize(customerNameRaw) || 'BILL';
    const datePart = sanitize(billDate || new Date().toISOString().split('T')[0]);
    const timePart = sanitize((billTime || new Date().toTimeString().slice(0,5)).replace(':', '')); // HHMM
    const fileBase = `${namePart}_${timePart}_${datePart}`;
    const fileTitle = `${fileBase}`; // browsers typically append .pdf

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
            <head>
                <title>${fileTitle}</title>
                <style>
                    body { 
                        font-family: 'Courier New', monospace; 
                        margin: 0; 
                        padding: 20px; 
                        font-size: 12px;
                        line-height: 1.4;
                    }
                    .bill-preview { background: white; }
                    .items-table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin: 15px 0;
                    }
                    .items-table th, .items-table td { 
                        border: 1px solid #000; 
                        padding: 6px 4px; 
                        font-size: 11px; 
                    }
                    .items-table th { 
                        background: #f0f0f0; 
                        text-align: center; 
                        font-weight: bold;
                    }
                    .number-col { text-align: right; }
                    .bill-header { 
                        text-align: center; 
                        border-bottom: 2px solid #000; 
                        padding-bottom: 15px; 
                        margin-bottom: 20px;
                    }
                    .store-name { 
                        font-size: 18px; 
                        font-weight: bold; 
                        margin-bottom: 5px;
                    }
                    .store-address {
                        font-size: 11px;
                        margin-bottom: 3px;
                    }
                    .bill-info {
                        display: flex;
                        justify-content: space-between;
                        margin: 20px 0;
                        padding: 10px 0;
                        border-bottom: 1px solid #ccc;
                    }
                    .bill-total { 
                        margin-top: 20px; 
                        text-align: right; 
                        border-top: 2px solid #000; 
                        padding-top: 15px; 
                    }
                    .total-line { 
                        display: flex; 
                        justify-content: space-between; 
                        margin: 5px 0; 
                        padding: 0 20px;
                    }
                    .bill-footer { 
                        margin-top: 30px; 
                        text-align: center; 
                        font-size: 10px; 
                        border-top: 1px solid #ccc; 
                        padding-top: 15px;
                    }
                    @media print {
                        @page { 
                            margin: 0; 
                            size: auto;
                        }
                        body { 
                            margin: 0; 
                            padding: 0;
                        }
                        .bill-preview { 
                            box-shadow: none; 
                            margin: 0;
                            padding: 20px;
                        }
                        /* Hide header and footer added by browser */
                        @page :header, @page :footer { 
                            display: none;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="bill-preview">${printContent}</div>
                <script>
                    document.title = ${JSON.stringify(fileTitle)};
                    window.onload = function() { window.print(); window.onafterprint = window.close; };
                <\/script>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}