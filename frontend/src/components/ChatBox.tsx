import { useState, useEffect, useRef } from 'react';
import { supabase, getChatId } from '../supabase';
import { markChatRead } from '../hooks/useUnreadCounts';

interface Message {
  id: string;
  chat_id: string;
  sender: string;
  text: string;
  created_at: string;
}

interface ChatBoxProps {
  myAddress: string;
  otherAddress: string;
  otherLabel: string;
  onClose: () => void;
  onRead?: () => void;
}

export const ChatBox = ({ myAddress, otherAddress, otherLabel, onClose, onRead }: ChatBoxProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatId = getChatId(myAddress, otherAddress);

  // Mark as read when opened
  useEffect(() => {
    markChatRead(chatId);
    onRead?.();
  }, [chatId]);

  useEffect(() => {
    supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setMessages(data); });
  }, [chatId]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
          markChatRead(chatId);
          onRead?.();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    await supabase.from('messages').insert({ chat_id: chatId, sender: myAddress, text: text.trim() });
    setText('');
    setSending(false);
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white border border-black shadow-2xl flex flex-col z-50" style={{ height: '420px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black bg-black text-white">        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Chat with</div>
          <div className="text-sm font-bold">{otherLabel} · {truncate(otherAddress)}</div>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-white text-lg leading-none">✕</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-zinc-400 text-xs mt-8">No messages yet. Say hello.</div>
        )}
        {messages.map(msg => {
          const isMe = msg.sender === myAddress;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] px-3 py-2 text-sm ${isMe ? 'bg-black text-white' : 'bg-zinc-100 text-black'}`}>
                {msg.text}
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">{formatTime(msg.created_at)}</div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-black flex">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 text-sm outline-none"
          autoFocus
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="px-4 py-2 bg-black text-white text-sm font-bold disabled:opacity-40 hover:bg-zinc-800 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
};
