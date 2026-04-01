import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../config/api";
import "./ChatBot.css";

function ChatBot({ isOpen, onClose }) {
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hi, I am EcoBuddy. Ask me anything about waste segregation or safe disposal.",
    },
  ]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const clearChat = () => {
    setMessages([
      {
        sender: "bot",
        text: "Chat cleared. Ask me about recycling, composting, or hazardous waste handling.",
      },
    ]);
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const message = inputValue.trim();
    if (!message || loading) {
      return;
    }

    setMessages((prev) => [...prev, { sender: "user", text: message }]);
    setInputValue("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Unable to get a response right now.");
      }

      setMessages((prev) => [...prev, { sender: "bot", text: data.reply }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: error.message || "Something went wrong while contacting EcoBuddy.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="chatbot-overlay" onClick={onClose}>
      <section className="chatbot-modal" onClick={(event) => event.stopPropagation()}>
        <header className="chatbot-header">
          <div>
            <h3>EcoBuddy Chat</h3>
            <p>Waste segregation assistant</p>
          </div>
          <button type="button" className="chatbot-close-btn" onClick={onClose}>
            x
          </button>
        </header>

        <div className="chatbot-messages">
          {messages.map((messageItem, index) => (
            <div
              key={`${messageItem.sender}-${index}`}
              className={`chatbot-message ${messageItem.sender === "user" ? "user" : "bot"}`}
            >
              {messageItem.text}
            </div>
          ))}
          {loading && <div className="chatbot-message bot chatbot-typing">EcoBuddy is typing...</div>}
          <div ref={messagesEndRef} />
        </div>

        <div className="chatbot-actions">
          <button type="button" className="chatbot-clear-btn" onClick={clearChat}>
            Clear Chat
          </button>
        </div>

        <form className="chatbot-input-row" onSubmit={sendMessage}>
          <input
            type="text"
            placeholder="Ask how to dispose an item..."
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            disabled={loading}
          />
          <button type="submit" disabled={loading || !inputValue.trim()}>
            Send
          </button>
        </form>
      </section>
    </div>
  );
}

export default ChatBot;
