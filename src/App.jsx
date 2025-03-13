import React, { useState } from 'react';
import axios from 'axios';

const App = () => {
  const [garmentImage, setGarmentImage] = useState(null);
  const [userImage, setUserImage] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState(null); // New state for background image
  const [garmentImageUrl, setGarmentImageUrl] = useState('');
  const [personImageUrl, setPersonImageUrl] = useState('');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(''); // URL for background image
  const [resultImage, setResultImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [removingBackground, setRemovingBackground] = useState(false);
  const [noBackgroundImage, setNoBackgroundImage] = useState(null);
  const [finalImage, setFinalImage] = useState(null); // Final composited image
  const apiKey = 'sk_81e10189b9dc4824912def2ef83876c8';
  const cloudinaryUploadPreset = 'chatApp';
  const cloudinaryCloudName = 'dajvx37wu';

  // Function to upload image to Cloudinary and return a public URL
  const uploadImage = async (file) => {
    if (!file) return null;

    if (file.size > 25 * 1024 * 1024) {
      throw new Error('Image size exceeds 25MB limit.');
    }

    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise((resolve) => (img.onload = resolve));
    const { width, height } = img;
    if (width < 256 || height < 256 || width > 1920 || height > 1920) {
      throw new Error('Image resolution must be between 256x256px and 1920x1920px.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryUploadPreset);

    try {
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`,
        formData
      );
      return response.data.secure_url;
    } catch (err) {
      throw new Error('Failed to upload image to Cloudinary: ' + err.message);
    }
  };

  const urlToFile = async (url, filename) => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type });
  };

  const handleGarmentChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setGarmentImage(file);
      try {
        const url = await uploadImage(file);
        setGarmentImageUrl(url);
        setError(null);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleUserImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setUserImage(file);
      try {
        const url = await uploadImage(file);
        setPersonImageUrl(url);
        setError(null);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleBackgroundChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setBackgroundImage(file);
      try {
        const url = await uploadImage(file);
        setBackgroundImageUrl(url);
        setError(null);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleTryOn = async () => {
    if (!garmentImageUrl || !personImageUrl) {
      setError('Please upload both a garment image and a user image.');
      return;
    }

    setLoading(true);
    setError(null);
    setNoBackgroundImage(null);
    setFinalImage(null);

    try {
      const response = await axios.post(
        '/api/v1/try-on',
        {
          person_image_url: personImageUrl,
          garment_image_url: garmentImageUrl,
        },
        {
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );

      if (response.data.result_url) {
        setResultImage(response.data.result_url);
      } else {
        setError('No result URL found in the response.');
      }
    } catch (err) {
      const apiError = err.response?.data;
      setError(
        apiError?.error || 'Failed to process the images. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBackground = async () => {
    if (!resultImage) {
      setError('No result image to process.');
      return;
    }

    setRemovingBackground(true);
    setError(null);

    try {
      const resultFile = await urlToFile(resultImage, 'result-image.jpg');
      const resultUploadUrl = await uploadImage(resultFile);

      const response = await axios.post(
        'https://api.remove.bg/v1.0/removebg',
        {
          image_url: resultUploadUrl,
          size: 'auto',
        },
        {
          headers: {
            'X-Api-Key': 'm99BxhZtR5LPqqzc6zz7Vtr9', // Replace with your remove.bg API key
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        }
      );

      const arrayBufferView = new Uint8Array(response.data);
      const blob = new Blob([arrayBufferView], { type: 'image/png' });
      const imageUrl = URL.createObjectURL(blob);
      setNoBackgroundImage(imageUrl);
    } catch (err) {
      setError('Failed to remove background: ' + (err.message || 'Unknown error'));
    } finally {
      setRemovingBackground(false);
    }
  };

  const applyBackground = () => {
    if (!noBackgroundImage || !backgroundImageUrl) {
      setError('Please remove the background and upload a background image first.');
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const foregroundImg = new Image();
    const backgroundImg = new Image();

    foregroundImg.crossOrigin = 'Anonymous';
    backgroundImg.crossOrigin = 'Anonymous';

    foregroundImg.src = noBackgroundImage;
    backgroundImg.src = backgroundImageUrl;

    Promise.all([
      new Promise((resolve) => (foregroundImg.onload = resolve)),
      new Promise((resolve) => (backgroundImg.onload = resolve)),
    ])
      .then(() => {
        // Set canvas size to match the foreground image
        canvas.width = foregroundImg.width;
        canvas.height = foregroundImg.height;

        // Draw background first (scaled to fit canvas)
        ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
        // Draw foreground on top
        ctx.drawImage(foregroundImg, 0, 0);

        // Convert to data URL and set as final image
        const finalImageUrl = canvas.toDataURL('image/png');
        setFinalImage(finalImageUrl);
      })
      .catch((err) => {
        setError('Failed to apply background: ' + err.message);
      });
  };

  return (
    <div className="min-h-screen bg-red-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-center text-indigo-600 mb-8">
            Virtual Try-On
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Garment Upload Section */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Select Garment</h3>
              <label className="flex flex-col items-center px-4 py-6 bg-white rounded-lg shadow-lg tracking-wide border border-blue-200 cursor-pointer hover:bg-blue-50 transition duration-300 w-full">
                <span className="text-sm text-gray-600">Choose a garment image</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleGarmentChange} 
                  className="hidden" 
                />
              </label>
              {garmentImage && (
                <div className="mt-4 flex justify-center">
                  <div className="relative">
                    <img
                      src={URL.createObjectURL(garmentImage)}
                      alt="Garment Preview"
                      className="h-48 w-auto object-contain rounded-lg"
                    />
                    <button 
                      onClick={() => setGarmentImage(null)} 
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Upload Section */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Upload Your Picture</h3>
              <label className="flex flex-col items-center px-4 py-6 bg-white rounded-lg shadow-lg tracking-wide border border-blue-200 cursor-pointer hover:bg-blue-50 transition duration-300 w-full">
                <span className="text-sm text-gray-600">Choose your photo</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleUserImageChange} 
                  className="hidden" 
                />
              </label>
              {userImage && (
                <div className="mt-4 flex justify-center">
                  <div className="relative">
                    <img
                      src={URL.createObjectURL(userImage)}
                      alt="User Preview"
                      className="h-48 w-auto object-contain rounded-lg"
                    />
                    <button 
                      onClick={() => setUserImage(null)} 
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Background Upload Section */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Upload Background</h3>
              <label className="flex flex-col items-center px-4 py-6 bg-white rounded-lg shadow-lg tracking-wide border border-blue-200 cursor-pointer hover:bg-blue-50 transition duration-300 w-full">
                <span className="text-sm text-gray-600">Choose a background image</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleBackgroundChange} 
                  className="hidden" 
                />
              </label>
              {backgroundImage && (
                <div className="mt-4 flex justify-center">
                  <div className="relative">
                    <img
                      src={URL.createObjectURL(backgroundImage)}
                      alt="Background Preview"
                      className="h-48 w-auto object-contain rounded-lg"
                    />
                    <button 
                      onClick={() => setBackgroundImage(null)} 
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Button Section */}
          <div className="flex justify-center mt-8 space-x-4">
            <button
              onClick={handleTryOn}
              disabled={loading || !garmentImage || !userImage}
              className={`${
                loading || !garmentImage || !userImage
                  ? 'bg-indigo-300 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } px-6 py-3 text-white rounded-lg font-medium shadow-md transition duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {loading ? 'Processing...' : 'Apply Garment'}
            </button>
            {resultImage && (
              <button
                onClick={handleRemoveBackground}
                disabled={removingBackground}
                className={`${
                  removingBackground
                    ? 'bg-green-300 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                } px-6 py-3 text-white rounded-lg font-medium shadow-md transition duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
              >
                {removingBackground ? 'Processing...' : 'Remove Background'}
              </button>
            )}
            {noBackgroundImage && backgroundImageUrl && (
              <button
                onClick={applyBackground}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 text-white rounded-lg font-medium shadow-md transition duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Apply Background
              </button>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Result Image */}
          {resultImage && !noBackgroundImage && !finalImage && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-800 mb-4 text-center">Result</h3>
              <div className="flex justify-center">
                <img
                  src={resultImage}
                  alt="Try-On Result"
                  className="max-w-full h-auto rounded-lg shadow-lg"
                  onError={() => setError('Failed to load result image.')}
                />
              </div>
              <div className="mt-4 flex justify-center">
                <a
                  href={resultImage}
                  download="virtual-tryon-result.jpg"
                  className="text-indigo-600 hover:text-indigo-800 transition"
                >
                  Download Result
                </a>
              </div>
            </div>
          )}

          {/* No Background Result Image */}
          {noBackgroundImage && !finalImage && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-800 mb-4 text-center">Background Removed</h3>
              <div className="flex justify-center">
                <img
                  src={noBackgroundImage}
                  alt="Background Removed Result"
                  className="max-w-full h-auto rounded-lg shadow-lg"
                  style={{ backgroundColor: '#f0f0f0' }}
                />
              </div>
              <div className="mt-4 flex justify-center space-x-4">
                <a
                  href={noBackgroundImage}
                  download="virtual-tryon-no-background.png"
                  className="text-indigo-600 hover:text-indigo-800 transition"
                >
                  Download No-Background Result
                </a>
                <button
                  onClick={() => setNoBackgroundImage(null)}
                  className="text-gray-600 hover:text-gray-800 transition"
                >
                  Back to Original Result
                </button>
              </div>
            </div>
          )}

          {/* Final Image with Background */}
          {finalImage && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-800 mb-4 text-center">Final Image with Background</h3>
              <div className="flex justify-center">
                <img
                  src={finalImage}
                  alt="Final Result with Background"
                  className="max-w-full h-auto rounded-lg shadow-lg"
                />
              </div>
              <div className="mt-4 flex justify-center space-x-4">
                <a
                  href={finalImage}
                  download="virtual-tryon-with-background.png"
                  className="text-indigo-600 hover:text-indigo-800 transition"
                >
                  Download Final Image
                </a>
                <button
                  onClick={() => setFinalImage(null)}
                  className="text-gray-600 hover:text-gray-800 transition"
                >
                  Back to No-Background Result
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <footer className="mt-8 text-center text-sm text-gray-500">
        Powered by Pixelcut Virtual Try-On API
      </footer>
    </div>
  );
};

export default App;