/**
 * notificationService.js
 * Service helper to dispatch FCM push notifications from the client side.
 */

export async function sendFcmPushes(pushData) {
  if (!pushData.fcm_tokens || pushData.fcm_tokens.length === 0 || !pushData.jwt || !pushData.project_id) {
    console.log('[SOS-Notification] Missing tokens, JWT or Project ID. Skipping pushes.');
    return;
  }

  try {
    console.log('[SOS-Notification] Requesting Access Token...');
    const bodyParams = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${encodeURIComponent(pushData.jwt)}`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: bodyParams
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      throw new Error(`Could not get access token: ${JSON.stringify(tokenData)}`);
    }

    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${pushData.project_id}/messages:send`;
    console.log(`[SOS-Notification] Access Token retrieved. Dispatching to ${pushData.fcm_tokens.length} device(s)...`);

    await Promise.all(
      pushData.fcm_tokens.map(async (token) => {
        try {
          const res = await fetch(fcmUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${tokenData.access_token}`
            },
            body: JSON.stringify({
              message: {
                token: token,
                notification: {
                  title: '🚨 SOS Alert',
                  body: `${pushData.sender_name} needs help!` + (pushData.location_text ? ` Location: ${pushData.location_text}` : '')
                },
                data: {
                  type: 'sos_alert',
                  sender_name: pushData.sender_name,
                  location_text: pushData.location_text || ''
                },
                android: {
                  priority: 'HIGH',
                  notification: {
                    channel_id: 'sos_alerts_v2',
                    sound: 'default',
                    notification_priority: 'PRIORITY_HIGH',
                    visibility: 'PUBLIC'
                  }
                },
                apns: {
                  payload: {
                    aps: {
                      alert: {
                        title: '🚨 SOS Alert',
                        body: `${pushData.sender_name} needs help!` + (pushData.location_text ? ` Location: ${pushData.location_text}` : '')
                      },
                      sound: 'default',
                      badge: 1
                    }
                  }
                }
              }
            })
          });

          const resultText = await res.text();
          console.log(`[SOS-Notification] Single push dispatch result: ${res.status} - ${resultText}`);
          
          if (!res.ok) {
            throw new Error(`FCM API Error ${res.status}: ${resultText}`);
          }
        } catch (e) {
          console.error('[SOS-Notification] Single push send failed:', e);
          throw e; // Bubble up the error so the UI catch block can alert us
        }
      })
    );
  } catch (err) {
    console.error('[SOS-Notification] Master push send failed:', err);
    throw err;
  }
}
