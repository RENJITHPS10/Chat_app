import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useFormik } from "formik";
import * as Yup from "yup";
import { updateProfile, reset } from "../features/authSlice";
import api from "../utils/api";
import { Camera, Save, X, Mail, User as UserIcon, Lock } from "lucide-react";

const ProfileModal = ({ onClose }) => {
    const dispatch = useDispatch();
    const fileRef = useRef(null);

    const { user, isLoading, isError, isSuccess, message } = useSelector(
        (state) => state.auth
    );

    const [preview, setPreview] = useState(user?.pic || "");
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (isError) alert(message);
        if (isSuccess) {
            // toast or alert here
            onClose();
        }
        dispatch(reset());
    }, [isError, isSuccess, message, dispatch, onClose]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            name: user?.name || "",
            email: user?.email || "",
            password: "",
        },
        validationSchema: Yup.object({
            name: Yup.string().required("Required"),
            password: Yup.string().min(6, "Minimum 6 characters"),
        }),
        onSubmit: (values) => {
            dispatch(
                updateProfile({
                    name: values.name,
                    email: user.email,
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-lg flex items-center justify-center z-[100] animate-slide-in p-4">
            <div className="glass shadow-glass rounded-3xl p-6 md:p-8 border border-white/10 relative overflow-hidden w-full max-w-lg">
                {/* Decorative Blob */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-brand/10 rounded-full blur-3xl -z-10 translate-x-10 -translate-y-10"></div>

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl text-white font-bold tracking-tight">Edit Profile</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition">
                        <X className="text-text-muted hover:text-white" />
                    </button>
                </div>

                {/* Avatar Upload */}
                <div className="flex flex-col items-center gap-4 mb-6 relative">
                    <div className="relative group">
                        <img
                            src={preview || "https://via.placeholder.com/100"}
                            alt="Profile"
                            className="h-28 w-28 rounded-full object-cover border-4 border-white/10 shadow-2xl group-hover:border-brand/50 transition-all duration-300"
                        />
                        <button
                            type="button"
                            onClick={() => fileRef.current.click()}
                            disabled={uploading}
                            className="absolute bottom-0 right-0 bg-brand text-white p-2 rounded-full shadow-lg hover:bg-brand-soft transition-all hover:scale-110 active:scale-95 border-4 border-slate-900"
                        >
                            <Camera size={16} />
                        </button>
                    </div>
                    <p className="text-text-muted text-xs">{uploading ? "Uploading..." : "Click icon to change"}</p>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                    />
                </div>

                {/* Form */}
                <form onSubmit={formik.handleSubmit} className="space-y-4">
                    {/* Name Input */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-brand-soft uppercase tracking-wider ml-1">Display Name</label>
                        <div className="relative">
                            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                            <input
                                name="name"
                                placeholder="Your Name"
                                className="w-full bg-black/30 text-white pl-11 pr-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all text-sm"
                                {...formik.getFieldProps("name")}
                            />
                        </div>
                    </div>

                    {/* Email Input (Read Only) */}
                    <div className="space-y-1 opacity-60">
                        <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider ml-1">Email Address (Read-only)</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                            <input
                                name="email"
                                type="email"
                                readOnly
                                disabled
                                className="w-full bg-white/5 text-text-muted pl-11 pr-4 py-3 rounded-xl border border-white/5 cursor-not-allowed text-sm"
                                {...formik.getFieldProps("email")}
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-brand-soft uppercase tracking-wider ml-1">New Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                            <input
                                name="password"
                                type="password"
                                placeholder="Leave blank to keep current"
                                className="w-full bg-black/30 text-white pl-11 pr-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all text-sm placeholder:text-text-muted/50"
                                {...formik.getFieldProps("password")}
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-brand hover:bg-brand-soft text-white font-bold py-3 rounded-xl shadow-lg shadow-brand/20 hover:shadow-brand/40 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Save size={18} />
                            {isLoading ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileModal;
