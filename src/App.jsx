import React, { useState } from 'react';
import axios from 'axios';

const App = () => {
  const [garmentImage, setGarmentImage] = useState(null);
  const [userImage, setUserImage] = useState(null);
  const [garmentImageUrl, setGarmentImageUrl] = useState('');
  const [personImageUrl, setPersonImageUrl] = useState('');
  const [resultImage, setResultImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const apiKey = 'sk_81e10189b9dc4824912def2ef83876c8';
  const cloudinaryUploadPreset = 'chatApp';
  const cloudinaryCloudName = 'dajvx37wu';

  // Function to upload image to Cloudinary and return a public URL
  const uploadImage = async (file) => {
    if (!file) return null;

    // Validate file size (< 25MB) and resolution (256x256px to 1920x1920px)
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

  const handleTryOn = async () => {
    if (!garmentImageUrl || !personImageUrl) {
      setError('Please upload both a garment image and a user image.');
      return;
    }

    setLoading(true);
    setError(null);

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

  return (
    <div className="min-h-screen bg-red-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-center text-indigo-600 mb-8">
            Virtual Try-On
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Garment Upload Section */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Select Garment</h3>
              <div className="flex items-center justify-center">
                <label className="flex flex-col items-center px-4 py-6 bg-white rounded-lg shadow-lg tracking-wide border border-blue-200 cursor-pointer hover:bg-blue-50 transition duration-300 w-full">
                  <span className="text-sm text-gray-600">Choose a garment image</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleGarmentChange} 
                    className="hidden" 
                  />
                </label>
              </div>
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
              <div className="flex items-center justify-center">
                <label className="flex flex-col items-center px-4 py-6 bg-white rounded-lg shadow-lg tracking-wide border border-blue-200 cursor-pointer hover:bg-blue-50 transition duration-300 w-full">
                  <span className="text-sm text-gray-600">Choose your photo</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleUserImageChange} 
                    className="hidden" 
                  />
                </label>
              </div>
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
          </div>

          {/* Button Section */}
          <div className="flex justify-center mt-8">
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
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Result Image */}
          {resultImage && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-800 mb-4 text-center">Result</h3>
              <div className="flex justify-center">
                <img
                  src={resultImage}
                  alt="Try-On Result"
                  className="max-w-full h-auto rounded-lg shadow-lg"
                  onError={() => setError('Failed to load result image. The URL might be invalid or expired.')}
                />
              </div>
              <div className="mt-4 text-center">
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
        </div>
      </div>
      
      <footer className="mt-8 text-center text-sm text-gray-500">
        Powered by Pixelcut Virtual Try-On API
      </footer>
    </div>
  );
};

export default App;