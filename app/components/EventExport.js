'use client';

import { useState } from 'react';
import styles from './EventExport.module.css';

export default function EventExport({ eventId, eventName, photoCount, emailCount }) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState([]);

  const handleExport = async () => {
    if (exportType.length === 0) {
      alert('Please select what you would like to export');
      return;
    }

    setIsExporting(true);
    try {
      // This is where we'll implement the actual export logic
      console.log('Exporting:', exportType, 'for event:', eventId);
      
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert('Export completed successfully!');
    } catch (error) {
      alert('Export failed. Please try again.');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCheckboxChange = (value) => {
    setExportType(prev => {
      if (prev.includes(value)) {
        return prev.filter(type => type !== value);
      } else {
        return [...prev, value];
      }
    });
  };

  return (
    <div className={styles.exportContainer}>
      <h3 className={styles.exportTitle}>Export Event Data</h3>
      
      <div className={styles.eventInfo}>
        <p className={styles.eventName}>{eventName}</p>
        <div className={styles.stats}>
          <span>{photoCount} Photos</span>
          <span>{emailCount} Emails</span>
        </div>
      </div>

      <div className={styles.exportOptions}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={exportType.includes('emails')}
            onChange={() => handleCheckboxChange('emails')}
            className={styles.checkbox}
          />
          Email List (CSV)
        </label>

        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={exportType.includes('photos')}
            onChange={() => handleCheckboxChange('photos')}
            className={styles.checkbox}
          />
          Photos (ZIP)
        </label>
      </div>

      <button
        onClick={handleExport}
        disabled={isExporting || exportType.length === 0}
        className={styles.exportButton}
      >
        {isExporting ? 'Exporting...' : 'Export Selected'}
      </button>
    </div>
  );
} 