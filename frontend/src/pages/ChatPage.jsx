import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";

const ChatPage = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!user) navigate("/");
  }, [user, navigate]);

  return (
    <div className="h-screen w-full flex items-center justify-center bg-black overflow-hidden relative">
      {/* Background Gradient Blob */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_#4f46e520,_transparent_50%)] pointer-events-none"></div>

      <div className="w-full h-full md:h-[95vh] md:max-w-[1600px] flex md:rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border-none md:border border-white/10 bg-black/40 backdrop-blur-xl relative z-10">
        <Sidebar />
        <ChatWindow />
      </div>
    </div>
  );
};

export default ChatPage;
