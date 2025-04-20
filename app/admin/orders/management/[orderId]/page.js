'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '../../../../../lib/AuthContext';
import styles from '../../orders.module.css';
import jsPDF from 'jspdf';

export default function EditOrder({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const orderId = resolvedParams.orderId;
  const { user } = useAuth();
  const supabase = createClientComponentClient();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [taxIncluded, setTaxIncluded] = useState(false);

  const [formData, setFormData] = useState({
    external_reference: '',
    customer_name: '',
    email: '',
    phone: '',
    shipping_address: '',
    shipping_method: '',
    total_photos: 0,
    status: 'pending',
    cost_per_unit: 0,
    total_amount: 0,
    invoice_number: null
  });

  useEffect(() => {
    const loadData = async () => {
      if (!orderId || !user) return;
      setLoading(true);
      
      try {
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('*, cost_per_unit, total_amount, invoice_number, tax_included')
          .eq('id', orderId)
          .eq('user_id', user.id)
          .single();

        if (orderError) throw orderError;
        if (!order) throw new Error('Order not found');
        
        console.log('✅ Order loaded:', order);

        setFormData({
          external_reference: order.external_reference || '',
          customer_name: order.customer_name || '',
          email: order.email || '',
          phone: order.phone || '',
          shipping_address: order.shipping_address || '',
          shipping_method: order.shipping_method || '',
          total_photos: order.total_photos || 0,
          status: order.status || 'pending',
          cost_per_unit: order.cost_per_unit || 0,
          total_amount: order.total_amount || 0,
          invoice_number: order.invoice_number || null
        });
        setTaxIncluded(order.tax_included || false);

      } catch (error) {
        console.error('Error loading order data:', error.message || error);
        alert('Failed to load order data.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [orderId, user, supabase]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'taxInclusionRadioEdit') {
        setTaxIncluded(value === 'true');
    } else if (type === 'checkbox') {
        // Keep handling other potential checkboxes if they exist
        // For now, assume only tax radio group needs special handling
    } else {
        let newValue = value;
        if (type === 'number') {
           if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
               newValue = value; 
           } else {
               newValue = formData[name] || ''; 
           }
        }
        if (name === 'total_photos' && type === 'number') {
            newValue = parseInt(value) || 0;
        } else if (name !== 'total_photos' && type === 'number') {
            // Keep other number fields as potentially numeric strings or empty
            // Parsing happens on submit
        } 
        
        setFormData(prev => ({
          ...prev,
          [name]: newValue
        }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    try {
      console.log('Updating order:', orderId);

      const updateData = {
        external_reference: formData.external_reference || null,
        customer_name: formData.customer_name,
        email: formData.email,
        phone: formData.phone,
        shipping_address: formData.shipping_address,
        shipping_method: formData.shipping_method,
        status: formData.status,
        cost_per_unit: parseFloat(formData.cost_per_unit) || 0,
        total_amount: parseFloat(formData.total_amount) || 0,
        total_photos: parseInt(formData.total_photos) || 0,
        tax_included: taxIncluded,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .eq('user_id', user.id);

      if (error) throw error;

      console.log('✅ Order updated successfully');
      router.push('/admin/orders/management');
    } catch (error) {
      console.error('Error updating order:', error.message || error);
      alert(`Failed to update order: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      console.log('Deleting order:', orderId, 'for user:', user.id);
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Supabase error:', error.message, error.details);
        throw error;
      }

      console.log('✅ Order deleted successfully');
      router.push('/admin/orders/management');
    } catch (error) {
      console.error('Error deleting order:', error.message || error);
      alert(`Failed to delete order: ${error.message || 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  };

  const generateInvoicePdf = async () => {
    console.log("Generating PDF with formData:", JSON.stringify(formData, null, 2));
    
    if (!formData) {
      console.error("Form data is not available for PDF generation.");
      alert("Could not generate PDF: Missing order information.");
      return;
    }

    let fetchedBusinessDetails = {
      name: '', addressLine1: '', addressLine2: '', phone: '', email: '', website: ''
    };
    try {
      if (!user) throw new Error("User not found, cannot fetch settings.");

      const { data: settingsData, error: fetchError } = await supabase
        .from('user_settings')
        .select('business_name, business_address_line1, business_address_line2, business_phone, business_email, business_website')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (fetchError) throw fetchError;

      if (settingsData) {
          fetchedBusinessDetails = {
            name: settingsData.business_name || '',
            addressLine1: settingsData.business_address_line1 || '',
            addressLine2: settingsData.business_address_line2 || '',
            phone: settingsData.business_phone || '',
            email: settingsData.business_email || '',
            website: settingsData.business_website || '' 
          };
      } else {
          console.warn("Business settings not found for user, using blanks on invoice.");
      }
    } catch (error) {
        console.error("Failed to fetch business settings:", error);
        alert("Could not load business settings for invoice. Fields will be left blank.");
    }

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
    };

    console.log("Generating invoice for order:", formData);
    console.log("Using business details:", fetchedBusinessDetails);

    // Use existing invoice number if available, otherwise generate
    const invoiceNumberToUse = formData.invoice_number || `INV-${orderId}-${Date.now().toString().slice(-5)}`;
    const invoiceDate = new Date().toLocaleDateString();
    const displayOrderNumber = formData.external_reference || 'N/A';

    // Save the generated invoice number if it wasn't already set
    if (!formData.invoice_number) {
        try {
            console.log(`Attempting to save internal invoice number ${invoiceNumberToUse} for order ${orderId}`);
            const { error: updateError } = await supabase
              .from('orders')
              .update({ invoice_number: invoiceNumberToUse })
              .eq('id', orderId)
              .eq('user_id', user.id); 
      
            if (updateError) throw updateError;
            console.log(`Successfully saved internal invoice number ${invoiceNumberToUse} for order ${orderId}`);
        } catch (error) {
            console.error("Failed to save internal invoice number to database:", error);
            alert(`Failed to save internal invoice number to database. Error: ${error.message}`);
            // Decide if we should proceed without saving - maybe return here?
        }
    } else {
        console.log(`Using existing invoice number: ${invoiceNumberToUse}`);
    }

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    let currentY = 20;
    const leftMargin = 15;
    const rightMargin = pageWidth - 15;
    const valueOffset = 40; // How far from the label the value starts

    // Helper function to add text and move Y
    const addText = (text, x, y, options = {}) => {
      doc.text(text, x, y, options);
      const fontSize = options.fontSize || doc.getFontSize();
      // Adjust line height based on font size for better spacing
      return y + (fontSize / 2.5); 
    };

    // --- Business Details (Top Left) --- 
    doc.setFontSize(10);
    if (fetchedBusinessDetails.name) currentY = addText(fetchedBusinessDetails.name, leftMargin, currentY);
    if (fetchedBusinessDetails.addressLine1) currentY = addText(fetchedBusinessDetails.addressLine1, leftMargin, currentY);
    if (fetchedBusinessDetails.addressLine2) currentY = addText(fetchedBusinessDetails.addressLine2, leftMargin, currentY);
    if (fetchedBusinessDetails.phone) currentY = addText(`Phone: ${fetchedBusinessDetails.phone}`, leftMargin, currentY);
    if (fetchedBusinessDetails.email) currentY = addText(`Email: ${fetchedBusinessDetails.email}`, leftMargin, currentY);
    if (fetchedBusinessDetails.website) currentY = addText(`Website: ${fetchedBusinessDetails.website}`, leftMargin, currentY);
    currentY += 5; // Add padding after business details

    // --- Invoice Title --- 
    doc.setFontSize(18); 
    doc.setFont(undefined, 'bold');
    currentY = addText("INVOICE", pageWidth / 2, currentY + 5, { align: 'center' });
    doc.setFont(undefined, 'normal');
    currentY += 10;

    // --- Bill To (Left) & Invoice Meta (Right) --- 
    const billToY = currentY;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    let leftY = addText("Bill To:", leftMargin, currentY);
    doc.setFont(undefined, 'normal');
    leftY = addText(formData.customer_name || "(No Customer Name)", leftMargin, leftY);
    if (formData.shipping_address) {
      const addressLines = doc.splitTextToSize(formData.shipping_address, (pageWidth / 2) - leftMargin - 5);
      addressLines.forEach(line => {
        leftY = addText(line, leftMargin, leftY);
      });
    } else {
      leftY = addText("(No Address Provided)", leftMargin, leftY);
    }
    if (formData.email) leftY = addText(formData.email, leftMargin, leftY);
    if (formData.phone) leftY = addText(formData.phone, leftMargin, leftY);
    
    // --- ADJUST STARTING X FOR LABELS TO PREVENT OVERLAP --- 
    const metaX = pageWidth / 2 - 10; // Moved further left
    let rightY = billToY; 
    
    // Invoice Meta Data (Aligned Right)
    doc.setFont(undefined, 'bold');
    doc.text("Invoice Number:", metaX, rightY); 
    doc.setFont(undefined, 'normal');
    // --- Reduce font size ONLY for the invoice number value ---
    const originalFontSize = doc.getFontSize();
    doc.setFontSize(8); // Set smaller font size
    doc.text(invoiceNumberToUse, rightMargin, rightY, { align: 'right' });
    doc.setFontSize(originalFontSize); // Restore original font size
    // ---------------------------------------------------------
    rightY += (originalFontSize / 2.5); // Move Y down using the original line height

    doc.setFont(undefined, 'bold');
    doc.text("Invoice Date:", metaX, rightY);
    doc.setFont(undefined, 'normal');
    doc.text(invoiceDate, rightMargin, rightY, { align: 'right' });
    rightY += (doc.getFontSize() / 2.5);

    doc.setFont(undefined, 'bold');
    doc.text("Order Number:", metaX, rightY);
    doc.setFont(undefined, 'normal');
    doc.text(displayOrderNumber, rightMargin, rightY, { align: 'right' });
    rightY += (doc.getFontSize() / 2.5);
    
    // Set currentY to the lower of the two columns + padding
    currentY = Math.max(leftY, rightY) + 15;

    // --- RE-ADD Itemized Table Header ---
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    const tableHeaderY = currentY;
    doc.text("Description", leftMargin, tableHeaderY);
    doc.text("Qty", pageWidth / 2 + 15, tableHeaderY, { align: 'center' });
    doc.text("Unit Price", pageWidth / 2 + 60, tableHeaderY, { align: 'center' }); // Adjusted X for wider column
    doc.text("Amount", rightMargin, tableHeaderY, { align: 'right' }); 
    doc.setFont(undefined, 'normal');
    doc.setLineWidth(0.5);
    doc.line(leftMargin, tableHeaderY + 2, rightMargin, tableHeaderY + 2); // Line below header
    currentY = tableHeaderY + 7; // Move Y down past header and line

    // --- RE-ADD Item Details ---
    doc.setFontSize(10);
    const costPerUnit = parseFloat(formData.cost_per_unit) || 0;
    const totalPhotos = parseInt(formData.total_photos) || 0;
    const calculatedLineTotal = costPerUnit * totalPhotos;

    const itemRowY = currentY;
    doc.text(`Photo Magnets`, leftMargin, itemRowY);
    doc.text(`${totalPhotos}`, pageWidth / 2 + 15, itemRowY, { align: 'center' });
    doc.text(formatCurrency(costPerUnit), pageWidth / 2 + 60, itemRowY, { align: 'center' }); // Adjusted X
    doc.text(formatCurrency(calculatedLineTotal), rightMargin, itemRowY, { align: 'right' });
    currentY = itemRowY + (doc.getFontSize() / 2.5) + 5; // Move Y down past item row
    
    // --- RE-ADD Subtotal Line ---
    doc.setLineWidth(0.2); // Thinner line before totals
    doc.line(pageWidth / 2, currentY, rightMargin, currentY); // Line above subtotal
    currentY += 5;
    
    doc.setFontSize(11); // Slightly larger font for totals
    doc.setFont(undefined, 'bold');
    const subtotalY = currentY;
    doc.text("Subtotal:", pageWidth / 2 + 10, subtotalY);
    doc.setFont(undefined, 'normal');
    doc.text(formatCurrency(calculatedLineTotal), rightMargin, subtotalY, { align: 'right' });
    currentY = subtotalY + (doc.getFontSize() / 2.5) + 2; // Move Y down

    // --- Total Amount Due (Manually Entered) --- 
    doc.setFontSize(14); // Make final total stand out
    doc.setFont(undefined, 'bold');
    const totalLabel = `Total Amount Due${taxIncluded ? ' (Tax Included)' : ''}`;
    const totalAmount = formatCurrency(formData.total_amount);
    
    // Position label towards the right, value aligned to the margin
    // --- ADJUST STARTING X FOR LABEL TO PREVENT OVERLAP ---
    const totalLabelX = pageWidth / 2 - 10; // Moved further left
    const totalY = currentY; // Use current Y
    doc.text(totalLabel, totalLabelX, totalY); 
    doc.setFont(undefined, 'normal');
    doc.text(totalAmount, rightMargin, totalY, { align: 'right' });
    currentY = totalY + (doc.getFontSize() / 2.5) + 10; // Add extra space after total
    
    // --- Footer --- 
    doc.setFontSize(10);
    currentY = addText("Thank you for your business!", pageWidth / 2, currentY, { align: 'center' });

    const sanitizedFilenameNum = invoiceNumberToUse.replace(/[^a-z0-9_-]/gi, '_'); 
    doc.save(`Invoice-${sanitizedFilenameNum}.pdf`); 
  };

  if (loading) {
    return <div className={styles.container}><div className={styles.loading}>Loading order...</div></div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Edit Order</h1>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Order Number</label>
            <input
              type="text"
              name="external_reference"
              value={formData.external_reference}
              readOnly
              className={`${styles.input} ${styles.readOnlyInput}`}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Customer Name *</label>
            <input
              type="text"
              name="customer_name"
              value={formData.customer_name}
              onChange={handleChange}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label className={styles.label}>Shipping Address</label>
            <textarea
              name="shipping_address"
              value={formData.shipping_address}
              onChange={handleChange}
              className={styles.textarea}
              rows="3"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Shipping Method</label>
            <select
              name="shipping_method"
              value={formData.shipping_method}
              onChange={handleChange}
              className={styles.select}
            >
              <option value="">Select shipping method...</option>
              <option value="standard">Standard Shipping</option>
              <option value="express">Express Shipping</option>
              <option value="pickup">Local Pickup</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Number of Photos</label>
            <input
              type="number"
              name="total_photos"
              value={formData.total_photos}
              onChange={handleChange}
              min="0"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className={styles.select}
            >
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Cost Per Magnet</label>
            <input
              type="number"
              name="cost_per_unit"
              value={formData.cost_per_unit || ''}
              onChange={handleChange}
              step="0.01"
              min="0"
              className={styles.input}
              placeholder="0.00"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Total Amount</label>
            <input
              type="number"
              name="total_amount"
              value={formData.total_amount || ''}
              onChange={handleChange}
              step="0.01"
              min="0"
              required
              className={`${styles.input}`}
              placeholder="0.00"
            />
          </div>

          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Amount includes Sales Tax? *
            </label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="taxInclusionRadioEdit"
                  value="true" 
                  checked={taxIncluded === true} 
                  onChange={handleChange}
                  required
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Yes</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="taxInclusionRadioEdit" 
                  value="false" 
                  checked={taxIncluded === false} 
                  onChange={handleChange}
                  required
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">No</span>
              </label>
            </div>
          </div>
        </div>

        <div className={styles.formFooter}>
          <div className={styles.buttonGroup}>
            <button
              type="submit"
              disabled={saving}
              className={styles.primaryButton}
            >
              {saving ? 'Saving Changes...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={generateInvoicePdf}
              className={styles.primaryButton}
              style={{ marginLeft: '10px' }}
            >
              Generate Invoice
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin/orders/management')}
              className={styles.secondaryButton}
            >
              Cancel
            </button>
          </div>
          
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className={styles.dangerButton}
          >
            {deleting ? 'Deleting Order...' : 'Delete Order'}
          </button>
        </div>
      </form>
    </div>
  );
} 