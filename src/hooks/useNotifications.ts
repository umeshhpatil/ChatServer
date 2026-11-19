import { useEffect, useCallback, useState } from 'react';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const res = await Notification.requestPermission();
        setPermission(res);
        return res;
      } catch (err) {
        console.warn('Notification permission error:', err);
      }
    }
    return permission;
  }, [permission]);

  const notifyMessage = useCallback(
    (title: string, body: string, iconUrl?: string | null) => {
      if (
        'Notification' in window &&
        Notification.permission === 'granted' &&
        document.visibilityState !== 'visible'
      ) {
        try {
          const notification = new Notification(title, {
            body,
            icon: iconUrl || '/vite.svg',
            badge: '/vite.svg',
          });

          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        } catch (err) {
          console.warn('Native notification trigger error:', err);
        }
      }
    },
    []
  );

  return {
    permission,
    requestPermission,
    notifyMessage,
  };
}
