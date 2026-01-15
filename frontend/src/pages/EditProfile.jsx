import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useFormik } from "formik";
import * as Yup from "yup";
import { updateProfile, reset, logout } from "../features/authSlice";
import api from "../utils/api";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import socket from "../socket";
import { Camera, Save, LogOut, ArrowLeft, Mail, User as UserIcon, Lock } from "lucide-react";

const EditProfile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const { user, isLoading, isError, isSuccess, message } = useSelector(
    (state) => state.auth
  );

  const [preview, setPreview] = useState(user?.pic || "");
  const [uploading, setUploading] = useState(false);

  //  Protect route
  useEffect(() => {
    if (!user) navigate("/");
  }, [user, navigate]);

  useEffect(() => {
    if (isError) alert(message);
    if (isSuccess) {
      // toast or alert here
      navigate("/chat");
    }
    dispatch(reset());
  }, [isError, isSuccess, message, dispatch, navigate]);


  // LOGOUT HANDLER 
  const handleLogout = () => {
    if (socket?.connected) {
      socket.disconnect();
    }
    dispatch(logout());
    navigate("/", { replace: true });
  };

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: user?.name || "",
      // Email is display only, but we keep it in state for consistency
      email: user?.email || "",
      password: "",
    },
    validationSchema: Yup.object({
      name: Yup.string().required("Required"),
      // Email validation removed as it's read-only
      password: Yup.string().min(6, "Minimum 6 characters"),
    }),
    onSubmit: (values) => {
      dispatch(
        updateProfile({
          name: values.name,
          email: user.email, // Force keep original email
          password: values.password || undefined,
          pic: preview,
        })
      );
    },
  });

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const { data } = await api.post("/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setPreview(data.url);
    } catch {
      alert("Image upload failed");
    }
    setUploading(false);
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-black overflow-hidden relative">
      {/* Background Gradient Blob */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,_#4f46e520,_transparent_50%)] pointer-events-none"></div>

      <div className="w-full h-full md:h-[95vh] md:max-w-[1600px] flex md:rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border-none md:border border-white/10 bg-black/40 backdrop-blur-xl relative z-10">

        {/* SIDEBAR */}
        <div className="hidden md:block border-r border-white/10 h-full">
          <Sidebar />
        </div>

        {/* RIGHT CONTENT */}
        <div className="flex-1 bg-chat-bg relative flex items-center justify-center p-4">

          {/* MOBILE BACK BUTTON */}
          <button onClick={() => navigate("/chat")} className="absolute top-6 left-6 md:hidden p-2 bg-white/10 rounded-full text-white">
            <ArrowLeft size={24} />
          </button>

          <div className="w-full max-w-lg">
            <div className="glass shadow-glass rounded-3xl p-8 md:p-10 border border-white/10 relative overflow-hidden">
              {/* Decorative Blob */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-brand/10 rounded-full blur-3xl -z-10 translate-x-10 -translate-y-10"></div>

              <h2 className="text-3xl text-white font-bold text-center mb-8 tracking-tight">Edit Profile</h2>

              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-4 mb-8 relative">
                <div className="relative group">
                  <img
                    src={preview || "https://via.placeholder.com/100"}
                    alt="Profile"
                    className="h-32 w-32 rounded-full object-cover border-4 border-white/10 shadow-2xl group-hover:border-brand/50 transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current.click()}
                    disabled={uploading}
                    className="absolute bottom-0 right-0 bg-brand text-white p-2.5 rounded-full shadow-lg hover:bg-brand-soft transition-all hover:scale-110 active:scale-95 border-4 border-slate-900"
                  >
                    <Camera size={18} />
                  </button>
                </div>
                <p className="text-text-muted text-sm">{uploading ? "Uploading..." : "Click icon to change"}</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>

              {/* Form */}
              <form onSubmit={formik.handleSubmit} className="space-y-5">

                {/* Name Input */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-brand-soft uppercase tracking-wider ml-1">Display Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                      name="name"
                      placeholder="Your Name"
                      className="w-full bg-black/30 text-white pl-12 pr-4 py-3.5 rounded-xl border border-white/10 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all"
                      {...formik.getFieldProps("name")}
                    />
                  </div>
                </div>

                {/* Email Input (Read Only) */}
                <div className="space-y-1 opacity-60">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider ml-1">Email Address (Read-only)</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                      name="email"
                      type="email"
                      readOnly
                      disabled
                      className="w-full bg-white/5 text-text-muted pl-12 pr-4 py-3.5 rounded-xl border border-white/5 cursor-not-allowed"
                      {...formik.getFieldProps("email")}
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-brand-soft uppercase tracking-wider ml-1">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                    <input
                      name="password"
                      type="password"
                      placeholder="Leave blank to keep current"
                      className="w-full bg-black/30 text-white pl-12 pr-4 py-3.5 rounded-xl border border-white/10 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all placeholder:text-text-muted/50"
                      {...formik.getFieldProps("password")}
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-brand hover:bg-brand-soft text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand/20 hover:shadow-brand/40 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Save size={20} />
                    {isLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>

              {/* LOGOUT */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 text-danger hover:text-red-400 py-2 hover:bg-danger/10 rounded-xl transition-all font-medium"
                >
                  <LogOut size={18} />
                  Log Out
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
