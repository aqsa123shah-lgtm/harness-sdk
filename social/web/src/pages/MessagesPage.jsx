import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { Icon, Verified } from '../components/Icons.jsx';
import { EmptyState, Spinner } from '../components/Modal.jsx';
import { clockTime, compact, relativeDay, timeAgo } from '../lib.js';

function ConversationList({ activeId, conversations, loading, onRefresh }) {
  return (
    <div className={`conv-list ${activeId ? 'has-active' : ''}`}>
      <header className="page-head">
        <h1>Messages</h1>
        <button type="button" className="icon-btn" onClick={onRefresh} aria-label="Refresh conversations">
          <Icon name="refresh" size={19} />
        </button>
      </header>

      {loading && (
        <div className="center-pad">
          <Spinner />
        </div>
      )}

      {!loading && !conversations.length && (
        <EmptyState
          icon="send"
          title="No messages yet"
          body="Open someone's profile and tap Message to start a conversation."
          action={
            <Link to="/explore" className="btn btn-primary btn-sm">
              Find people
            </Link>
          }
        />
      )}

      <ul className="conv-items">
        {conversations.map((conversation) => (
          <li key={conversation.id}>
            <Link
              to={`/messages/${conversation.id}`}
              className={`conv-item ${conversation.id === activeId ? 'is-active' : ''}`}
            >
              <Avatar user={conversation.partner} size={48} />
              <span className="conv-meta">
                <span className="conv-name">
                  {conversation.partner.username}
                  {conversation.partner.isVerified && <Verified size={12} />}
                </span>
                <span className="conv-last">
                  {conversation.lastMessage?.senderId === conversation.partner.id ? '' : 'You: '}
                  {conversation.lastMessage?.mediaUrl && !conversation.lastMessage.text
                    ? 'Sent an attachment'
                    : conversation.lastMessage?.text || 'Say hello'}
                </span>
              </span>
              <span className="conv-side">
                <span className="conv-time">
                  {conversation.lastMessageAt ? timeAgo(conversation.lastMessageAt) : ''}
                </span>
                {conversation.unread > 0 && <span className="badge">{conversation.unread}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Chat({ id }) {
  const { user, notifyToast } = useApp();
  const navigate = useNavigate();
  const [meta, setMeta] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const lastTs = useRef(0);
  const typingSent = useRef(0);
  const scrollRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    let alive = true;
    lastTs.current = 0;
    setMessages([]);
    api
      .get(`/conversations/${id}`)
      .then((data) => alive && setMeta(data))
      .catch((error) => notifyToast(error.message, 'error'));
    api
      .get(`/conversations/${id}/messages`)
      .then((data) => {
        if (!alive) return;
        setMessages(data.messages);
        lastTs.current = data.messages[data.messages.length - 1]?.createdAt || 0;
        api.post(`/conversations/${id}/read`).catch(() => {});
      })
      .catch((error) => notifyToast(error.message, 'error'));
    return () => {
      alive = false;
    };
  }, [id, notifyToast]);

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const data = await api.get(`/conversations/${id}/poll?after=${lastTs.current}`);
        if (data.messages.length) {
          setMessages((prev) => [...prev, ...data.messages]);
          lastTs.current = data.messages[data.messages.length - 1].createdAt;
          api.post(`/conversations/${id}/read`).catch(() => {});
        }
        setPartnerTyping(data.partnerTyping);
        setMeta((prev) => ({ ...(prev || {}), partner: data.partner }));
      } catch {
        /* polling is best-effort */
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [id]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length, partnerTyping]);

  const pingTyping = () => {
    if (Date.now() - typingSent.current < 2500) return;
    typingSent.current = Date.now();
    api.post(`/conversations/${id}/typing`).catch(() => {});
  };

  const send = async (event) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      const data = await api.post(`/conversations/${id}/messages`, { text: value });
      setMessages((prev) => [...prev, data.message]);
      lastTs.current = data.message.createdAt;
      setText('');
    } catch (error) {
      notifyToast(error.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const sendAttachment = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const media = await api.upload(file);
      const data = await api.post(`/conversations/${id}/messages`, {
        mediaUrl: media.url,
        mediaType: media.type,
      });
      setMessages((prev) => [...prev, data.message]);
      lastTs.current = data.message.createdAt;
    } catch (error) {
      notifyToast(error.message, 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const partner = meta?.partner;

  return (
    <div className="chat">
      <header className="chat-head">
        <button type="button" className="icon-btn chat-back" onClick={() => navigate('/messages')} aria-label="Back">
          <Icon name="arrow-left" size={20} />
        </button>
        {partner && (
          <Link to={`/u/${partner.username}`} className="chat-person">
            <Avatar user={partner} size={38} />
            <span>
              <span className="chat-name">
                {partner.username} {partner.isVerified && <Verified size={12} />}
              </span>
              <span className="chat-status">
                {partnerTyping ? 'typing…' : partner.online ? 'Active now' : 'Offline'}
              </span>
            </span>
          </Link>
        )}
      </header>

      <div className="chat-scroll" ref={scrollRef}>
        {!messages.length && <p className="chat-empty">Say hello — this is the start of your conversation.</p>}
        {messages.map((message, index) => {
          const mine = message.senderId === user.id;
          const previous = messages[index - 1];
          const showDay = !previous || relativeDay(previous.createdAt) !== relativeDay(message.createdAt);
          const isLastMine = mine && index === messages.length - 1;
          return (
            <div key={message.id}>
              {showDay && <div className="chat-day">{relativeDay(message.createdAt)}</div>}
              <div className={`bubble-row ${mine ? 'is-mine' : ''}`}>
                {!mine && <Avatar user={partner} size={26} />}
                <div className={`bubble ${mine ? 'is-mine' : ''}`}>
                  {message.mediaUrl && (
                    <div className="bubble-media">
                      {message.mediaType === 'video' ? (
                        <video src={message.mediaUrl} controls playsInline />
                      ) : (
                        <img src={message.mediaUrl} alt="Attachment" />
                      )}
                    </div>
                  )}
                  {message.text && <p>{message.text}</p>}
                  <span className="bubble-time">
                    {clockTime(message.createdAt)}
                    {isLastMine && message.readAt ? ' · Read' : ''}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {partnerTyping && (
          <div className="bubble-row">
            <Avatar user={partner} size={26} />
            <div className="bubble typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>

      <form className="chat-composer" onSubmit={send}>
        <button
          type="button"
          className="icon-btn"
          onClick={() => fileRef.current?.click()}
          aria-label="Attach a photo or video"
          disabled={uploading}
        >
          <Icon name="image" size={22} />
        </button>
        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={sendAttachment} hidden />
        <input
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            pingTyping();
          }}
          placeholder={uploading ? 'Uploading attachment…' : 'Message…'}
          aria-label="Message"
          maxLength={2000}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={!text.trim() || sending}>
          Send
        </button>
      </form>
    </div>
  );
}

export default function MessagesPage() {
  const { id } = useParams();
  const { notifyToast } = useApp();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.get('/conversations');
      setConversations(data.conversations);
    } catch (error) {
      notifyToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [notifyToast]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <div className={`messages-page ${id ? 'has-chat' : ''}`}>
      <ConversationList activeId={id} conversations={conversations} loading={loading} onRefresh={load} />
      {id ? (
        <Chat key={id} id={id} />
      ) : (
        <div className="chat chat-placeholder">
          <div className="chat-placeholder-inner">
            <span className="empty-icon">
              <Icon name="send" size={26} />
            </span>
            <h3>Your messages</h3>
            <p>Pick a conversation to keep talking, or start a new one from someone's profile.</p>
            <p className="muted small">{compact(conversations.length)} conversations</p>
          </div>
        </div>
      )}
    </div>
  );
}
