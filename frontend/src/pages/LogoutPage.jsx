import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { logout } from "../features/authSlice";
import socket from "../socket";

const LogoutPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    if (socket && socket.connected) {
      socket.disconnect();
    }
    dispatch(logout());
    navigate("/signup", { replace: true });
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="chat-shell flex w-full max-w-4xl h-[80vh] flex-col md:flex-row bg-slate-900">
        {/* Left: profile preview */}
        <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-slate-700 flex flex-col">
          <div className="bg-panel-header h-16 flex items-center gap-3 px-4 border-b border-slate-700">
            <img
              src={user?.pic || "https://via.placeholder.com/40"}
              alt={user?.name || "Profile"}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-emerald-500/60"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-50">
                {user?.name || "User"}
              </span>
              <span className="text-[11px] text-emerald-300/80">
                Profile &amp; logout
              </span>
            </div>
          </div>
          <div className="flex-1 p-4">
            <p className="text-xs text-slate-300">
              Click{" "}
              <span className="font-semibold text-emerald-400">Log Out</span> to
              end your session, or return to your chats to keep talking.
            </p>
          </div>
        </div>

        {/* Right: actions */}
        <div className="w-full md:w-2/3 bg-chat-bg flex flex-col items-center justify-center p-8 text-center">
          <h1 className="text-2xl md:text-3xl text-slate-50 font-light mb-3">
            Ready to leave?
          </h1>
          <p className="text-sm text-slate-300 mb-6 max-w-md">
            Once you log out, you&apos;ll need to sign in again to access your
            conversations and messages.
          </p>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button onClick={handleLogout} className="btn-primary">
              Log Out
            </button>

            <Link to="/chat">
              <button className="btn-secondary">Go Back to Chats</button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoutPage;
