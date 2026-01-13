"use client";
import { useState, useRef, useEffect } from "react";
import "./chatWidget.css";

function getAnonymousId() {
  let id = localStorage.getItem("vet_chat_anonymous_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("vet_chat_anonymous_id", id);
  }
  return id;
}

export default function ChatWidget({ session }) {
  const { context } = session;
  const anonymousId = getAnonymousId();
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: context?.petName
        ? `Hi! How can I help ${context.petName}?`
        : "Hi! How can I help your pet today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]); 
  const [appointmentFlow, setAppointmentFlow] = useState(false);
  const [appointmentData, setAppointmentData] = useState({
    ownerName: "",
    petName: context?.petName || "",
    phoneNumber: "",
    preferredDateTime: "",
  });
  const [currentStep, setCurrentStep] = useState(0);
  const chatBodyRef = useRef(null);

  const steps = [
    { key: "ownerName", question: "What's your name?" },
    { key: "petName", question: "What's your pet's name?" },
    { key: "phoneNumber", question: "Your phone number?" },
    { key: "preferredDateTime", question: "Preferred appointment date & time?" },
  ];

  const addMessage = (msg) => {
    setMessages((prev) => [...prev, msg]);
  };

  const scrollToBottom = () => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    addMessage(userMessage);

    if (appointmentFlow) {
      const stepKey = steps[currentStep].key;
      setAppointmentData((prev) => ({ ...prev, [stepKey]: input }));
      setInput("");

      if (currentStep + 1 < steps.length) {
        addMessage({ sender: "bot", text: steps[currentStep + 1].question });
        setCurrentStep(currentStep + 1);
      } else {
        const updatedData = { ...appointmentData, [stepKey]: input };
        try {
          await fetch("http://localhost:5001/api/appointments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: anonymousId, ...updatedData }),
          });
          addMessage({ sender: "bot", text: "✅ Your appointment is booked!" });
        } catch (error) {
          addMessage({ sender: "bot", text: "❌ Failed to book appointment. Please try again." });
        }
        setAppointmentFlow(false);
        setCurrentStep(0);
      }
      return;
    }

    const currentInput = input;
    setInput("");
    setIsLoading(true);

    try {

      const res = await fetch("http://localhost:5001/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: currentInput,
          context,
          anonymousId,
          conversationHistory, // Include history
        }),
      });

      const data = await res.json();
      const botReply = data.reply || "Sorry, I didn't get that.";

      addMessage({ sender: "bot", text: botReply });


      setConversationHistory((prev) => [
        ...prev,
        { role: "user", content: currentInput },
        { role: "assistant", content: botReply },
      ]);
    } catch (error) {
      addMessage({ sender: "bot", text: " Connection error. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const startAppointmentFlow = () => {
    setAppointmentFlow(true);
    setCurrentStep(0);
    addMessage({ sender: "bot", text: steps[0].question });
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        🐾 Vet Assistant
        {!appointmentFlow && (
          <button className="book-btn" onClick={startAppointmentFlow}>
            Book Appointment
          </button>
        )}
      </div>

      <div className="chat-body" ref={chatBodyRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.sender}`}>
            {msg.text}
          </div>
        ))}
        {isLoading && (
          <div className="message bot">
            <span className="typing-indicator">●●●</span>
          </div>
        )}
      </div>

      <div className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={appointmentFlow ? "Type your answer..." : "Ask about your pet..."}
          onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSendMessage()}
          disabled={isLoading}
        />
        <button onClick={handleSendMessage} disabled={isLoading}>
          {isLoading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}