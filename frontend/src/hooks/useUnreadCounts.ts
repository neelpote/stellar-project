import { useState, useEffect, useRef } from 'react';
import { supabase, getChatId } from '../supabase';

// Stores the timestamp when each chat was last opened (persisted in localStorage)
const getLastRead = (chatId: string): string => {
  return localStorage.getItem(`chat_read_${chatId}`) || new Date(0).toISOString();
};

export const markChatRead = (chatId: string) => {
  localStorage.setItem(`chat_read_${chatId}`, new Date().toISOString());
};

// Returns a map of chatId -> unread count, and a total unread count
export const useUnreadCounts = (myAddress: string, otherAddresses: string[]) => {
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  useEffect(() => {
    if (!myAddress || otherAddresses.length === 0) return;

    channelsRef.current.forEach(ch => supabase.removeChannel(ch));
    channelsRef.current = [];

    const newMap: Record<string, number> = {};    otherAddresses.forEach(addr => {
      const chatId = getChatId(myAddress, addr);

      // Load initial unread count
      const lastRead = getLastRead(chatId);
      supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('chat_id', chatId)
        .neq('sender', myAddress)
        .gt('created_at', lastRead)
        .then(({ count }) => {
          if (count && count > 0) {
            setUnreadMap(prev => ({ ...prev, [chatId]: count }));
          }
        });

      // Subscribe to new messages for this chat
      const channel = supabase
        .channel(`unread:${chatId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
          (payload) => {
            const msg = payload.new as { sender: string; text: string; chat_id: string };
            if (msg.sender !== myAddress) {
              setUnreadMap(prev => ({
                ...prev,
                [chatId]: (prev[chatId] || 0) + 1,
              }));

              if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
                new Notification('New message on DeCo', {
                  body: `${msg.sender.slice(0, 6)}...${msg.sender.slice(-4)}: ${msg.text.slice(0, 60)}`,
                  icon: '/favicon.ico',
                });
              }
            }
          }
        )
        .subscribe();

      channelsRef.current.push(channel);
    });

    setUnreadMap(newMap);

    return () => {
      channelsRef.current.forEach(ch => supabase.removeChannel(ch));
    };
  }, [myAddress, otherAddresses.join(',')]);

  const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0);

  const clearUnread = (otherAddress: string) => {
    const chatId = getChatId(myAddress, otherAddress);
    markChatRead(chatId);
    setUnreadMap(prev => {
      const next = { ...prev };
      delete next[chatId];
      return next;
    });
  };

  const getUnread = (otherAddress: string) => {
    const chatId = getChatId(myAddress, otherAddress);
    return unreadMap[chatId] || 0;
  };

  return { totalUnread, getUnread, clearUnread };
};

// Request browser notification permission on first use
export const requestNotificationPermission = () => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
};
