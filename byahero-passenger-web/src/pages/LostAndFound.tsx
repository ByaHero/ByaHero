import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PassengerHeader from '../components/PassengerNavbar';
import PassengerFooter from '../components/PassengerFooter';
import { useAuth } from '../context/AuthContext';
import AlertModal from '../components/AlertModal';
import { MaterialIcons } from '../components/ui/MaterialIcons';

export const LostAndFound: React.FC = () => {
  const navigate = useNavigate();
  const { serverUrl } = useAuth();

  const [itemType, setItemType] = useState<'lost' | 'found'>('lost');
  const [description, setDescription] = useState('');
  const [busNumber, setBusNumber] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AlertModal State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning' | 'confirm';
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'error',
    onConfirm: () => {},
  });

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' | 'confirm' = 'error',
    onConfirm?: () => void
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      onConfirm: () => {
        setAlertConfig((prev) => ({ ...prev, visible: false }));
        if (onConfirm) onConfirm();
      },
    });
  };

  const handlePickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedPhotos.length >= 2) {
      showAlert('Limit Reached', 'You can only upload a maximum of 2 photos.', 'warning');
      return;
    }
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSelectedPhotos([...selectedPhotos, event.target.result as string]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearPhotos = () => {
    setSelectedPhotos([]);
  };

  const handleSubmitReport = async () => {
    if (!description.trim()) {
      showAlert('Validation Error', 'Description is required.', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('itemType', itemType);
      formData.append('description', description.trim());
      formData.append('bus_number', busNumber.trim());

      selectedPhotos.forEach((photoUri, index) => {
        formData.append(`images[${index}]`, photoUri);
      });

      const res = await fetch(`${serverUrl}/api/lost-and-found/create`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      });
      setIsSubmitting(false);

      if (res.ok) {
        showAlert('Success', 'Report successfully submitted to the server!', 'success', () => {
          setDescription('');
          setBusNumber('');
          setSelectedPhotos([]);
        });
      } else {
        throw new Error('Server responded with error');
      }
    } catch (err) {
      setIsSubmitting(false);
      try {
        const stored = localStorage.getItem('byahero_pending_lost_found') || '[]';
        const pending = JSON.parse(stored);
        pending.push({
          type: itemType,
          description: description.trim(),
          bus_number: busNumber.trim(),
          timestamp: Date.now(),
        });
        localStorage.setItem('byahero_pending_lost_found', JSON.stringify(pending));

        showAlert(
          'Saved Locally',
          'Network connection issue. Report saved locally and queued for synchronization.',
          'info',
          () => {
            setDescription('');
            setBusNumber('');
            setSelectedPhotos([]);
          }
        );
      } catch (e) {
        showAlert('Error', 'Failed to save report.', 'error');
      }
    }
  };

  return (
    <div className="h-screen max-h-screen w-full flex flex-col bg-white overflow-hidden">
      <PassengerHeader pageTitle="Lost and Found" showBackButton={true} />

      <div className="flex-1 overflow-y-auto w-full overscroll-contain">
        <div className="max-w-md mx-auto w-full pb-8">
          <div className="p-4 bg-slate-100/70 min-h-[560px] mt-4 rounded-t-[32px]">
            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={() => navigate('/lost-and-found/my-reports')}
                className="flex items-center bg-blue-50 border border-blue-100 px-3.5 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
              >
                <MaterialIcons name="receipt_long" size={14} color="#1e3a8a" className="mr-1" />
                <span className="text-[11px] font-bold text-[#1e3a8a]">Check Status</span>
              </button>
            </div>

            {/* Toggle Selector */}
            <div className="flex justify-between mb-5 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm gap-2">
              <button
                type="button"
                onClick={() => setItemType('lost')}
                className={`flex-1 py-2.5 rounded-xl flex items-center justify-center font-bold text-sm transition-all cursor-pointer ${
                  itemType === 'lost' ? 'bg-[#1e3a8a] text-white shadow-sm' : 'bg-transparent text-slate-400'
                }`}
              >
                Lost
              </button>

              <button
                type="button"
                onClick={() => setItemType('found')}
                className={`flex-1 py-2.5 rounded-xl flex items-center justify-center font-bold text-sm transition-all cursor-pointer ${
                  itemType === 'found' ? 'bg-[#1e3a8a] text-white shadow-sm' : 'bg-transparent text-slate-400'
                }`}
              >
                Found
              </button>
            </div>

            {/* Form Fields Card */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4 mb-4">
              {/* Description */}
              <div>
                <label className="text-xs font-bold text-slate-400 mb-2 block">
                  {itemType === 'lost' ? 'Describe the item you lost?' : 'Describe the item you found?'}
                </label>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide key identifying marks, color, name tag details, or where/when you suspect it happened..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>

              {/* Photo Upload Area */}
              <div>
                <label className="text-xs font-bold text-slate-400 mb-2 block">Upload Item Photo</label>

                {selectedPhotos.length === 0 ? (
                  <label className="w-full bg-slate-50 border border-dashed border-slate-200 rounded-2xl py-8 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors">
                    <MaterialIcons name="add_a_photo" size={32} color="#1e3a8a" className="mb-2" />
                    <span className="text-xs text-slate-400 font-bold">Up to 2 photos</span>
                    <input type="file" accept="image/*" onChange={handlePickImage} className="hidden" />
                  </label>
                ) : (
                  <div>
                    <div className="flex gap-3">
                      {selectedPhotos.map((photoUri, index) => (
                        <div key={index} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200">
                          <img src={photoUri} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {selectedPhotos.length < 2 && (
                        <label className="w-20 h-20 bg-slate-50 border border-dashed border-slate-200 rounded-xl flex items-center justify-center cursor-pointer hover:bg-slate-100">
                          <MaterialIcons name="add_a_photo" size={20} color="#1e3a8a" />
                          <input type="file" accept="image/*" onChange={handlePickImage} className="hidden" />
                        </label>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleClearPhotos}
                      className="mt-3 w-full bg-red-50 border border-red-100 py-2 rounded-xl text-center text-xs font-bold text-[#ef4444] hover:bg-red-100"
                    >
                      Clear Photos
                    </button>
                  </div>
                )}
              </div>

              {/* Bus Number */}
              <div>
                <label className="text-xs font-bold text-slate-400 mb-2 block">
                  {itemType === 'lost' ? 'Last Bus lost (optional)' : 'Last Bus found (optional)'}
                </label>
                <input
                  type="text"
                  value={busNumber}
                  onChange={(e) => setBusNumber(e.target.value)}
                  placeholder="e.g. Bus 12, Route 3"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                />
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSubmitReport}
                disabled={isSubmitting}
                className="w-full bg-[#1e3a8a] hover:bg-blue-900 py-3.5 rounded-2xl flex items-center justify-center font-bold text-sm text-white shadow-md transition-all cursor-pointer"
              >
                {isSubmitting ? 'Saving Report...' : 'Save Report'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <PassengerFooter activeTab="location" />

      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
      />
    </div>
  );
};
export default LostAndFound;
