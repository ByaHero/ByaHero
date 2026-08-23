interface TriggerSOSParams {
  baseUrl: string;
  locationText?: string;
  lat?: number | null;
  lng?: number | null;
  promptMessage?: string;
  skipPrompt?: boolean;
  showAlertFn?: (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' | 'confirm',
    onConfirm?: () => void,
    onCancel?: () => void
  ) => void;
}

export const executeSOS = async ({ baseUrl, locationText = 'Web Client', lat = null, lng = null, showAlertFn }: TriggerSOSParams) => {
  const displayAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' | 'confirm' = 'info',
    onConfirm?: () => void,
    onCancel?: () => void
  ) => {
    if (showAlertFn) {
      showAlertFn(title, message, type, onConfirm, onCancel);
    } else {
      alert(`${title}: ${message}`);
      if (onConfirm) onConfirm();
    }
  };

  try {
    const email = localStorage.getItem('byahero_cached_email') || 'Guest';
    const res = await fetch(`${baseUrl}/api/sos/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        recipients: [],
        location_text: locationText,
        lat,
        lng
      }),
      credentials: 'include'
    });
    const data = await res.json();
    
    if (data.success) {
      displayAlert('SOS Broadcasted', 'Help is on the way! Your SOS alert and live location have been broadcasted to emergency responders and your circle.', 'success');
    } else {
      displayAlert('SOS Failed', data.message || 'Failed to send SOS.', 'error');
    }
  } catch (err) {
    console.error('SOS Alert send error:', err);
    displayAlert('SOS Failed', 'Network error. Failed to broadcast SOS.', 'error');
  }
};

export const triggerSOS = (params: TriggerSOSParams) => {
  if (params.skipPrompt) {
    return executeSOS(params);
  }

  if (params.showAlertFn) {
    params.showAlertFn(
      'Emergency Center',
      params.promptMessage || 'Trigger Panic Alert? This will broadcast your SOS alert to emergency contacts and nearby buses.',
      'confirm',
      () => executeSOS(params),
      () => {}
    );
  } else {
    const confirmed = window.confirm(params.promptMessage || 'Trigger Panic Alert? This will broadcast your SOS alert to emergency contacts.');
    if (confirmed) {
      executeSOS(params);
    }
  }
};
