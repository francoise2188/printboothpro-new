import styles from './MarketManager.module.css';

{/* Design Upload Section */}
{!isNewMarket && selectedMarket && (
  <div className={styles.designSection}>
    <h3 className={styles.sectionTitle}>Market Designs</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Border Upload */}
      <div className={styles.uploadContainer}>
        <h4 className={styles.uploadTitle}>Photo Border</h4>
        <div className="flex flex-col items-center space-y-4">
          <label className="block text-center cursor-pointer w-full">
            <span className={styles.uploadButton}>
              {uploading ? 'Uploading...' : 'Upload Border'}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleUpload(e, 'border')}
              disabled={uploading}
              className="hidden"
            />
          </label>
          {designs.border && (
            <button
              onClick={() => handleDeleteUpload('border')}
              className={styles.removeButton}
            >
              Remove Border
            </button>
          )}
        </div>
      </div>

      {/* Landing Page Upload */}
      <div className={styles.uploadContainer}>
        <h4 className={styles.uploadTitle}>Landing Page Background</h4>
        <div className="flex flex-col items-center space-y-4">
          <label className="block text-center cursor-pointer w-full">
            <span className={styles.uploadButton}>
              {uploading ? 'Uploading...' : 'Upload Landing Page'}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleUpload(e, 'landing_page')}
              disabled={uploading}
              className="hidden"
            />
          </label>
          {designs.landing_page && (
            <button
              onClick={() => handleDeleteUpload('landing_page')}
              className={styles.removeButton}
            >
              Remove Background
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
)} 