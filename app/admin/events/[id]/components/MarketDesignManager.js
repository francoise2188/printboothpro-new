import ImagePreview from '../../../../components/ImagePreview';

{/* Replace the existing image previews with the new component */}
{selectedMarket && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {/* Landing Background */}
    <div className="border rounded p-4">
      <h3 className="font-semibold mb-4">Landing Page Background</h3>
      {designs.landing_background && (
        <div className="mb-4">
          <ImagePreview
            imageData={designs.landing_background}
            alt="Landing Background"
            width={200}
            height={150}
          />
        </div>
      )}
      <label className="block text-center cursor-pointer">
        <span className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 inline-block">
          {uploading ? 'Uploading...' : 'Upload Background'}
        </span>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleUpload(e, 'landing_background')}
          disabled={uploading}
          className="hidden"
        />
      </label>
    </div>

    {/* Camera Overlay */}
    <div className="border rounded p-4">
      <h3 className="font-semibold mb-4">Camera Overlay</h3>
      {designs.camera_overlay && (
        <div className="mb-4">
          <ImagePreview
            imageData={designs.camera_overlay}
            alt="Camera Overlay"
            width={200}
            height={150}
          />
        </div>
      )}
      <label className="block text-center cursor-pointer">
        <span className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 inline-block">
          {uploading ? 'Uploading...' : 'Upload Overlay'}
        </span>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleUpload(e, 'camera_overlay')}
          disabled={uploading}
          className="hidden"
        />
      </label>
    </div>
  </div>
)} 