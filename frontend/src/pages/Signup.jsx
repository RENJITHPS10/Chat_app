import React, { useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { register, reset } from "../features/authSlice";
import { Mail, Lock, User, UserPlus, ArrowRight } from "lucide-react";

const Signup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isLoading, isError, isSuccess, message } = useSelector(
    (state) => state.auth
  );

  useEffect(() => {
    if (isError) {
      alert(message);
    }
    if (isSuccess || user) {
      navigate("/chat");
    }
    dispatch(reset());
  }, [user, isError, isSuccess, message, navigate, dispatch]);

  const formik = useFormik({
    initialValues: { name: "", email: "", password: "" },
    validationSchema: Yup.object({
      name: Yup.string()
        .max(20, "Must be 20 characters or less")
        .required("Required"),
      email: Yup.string().email("Invalid email address").required("Required"),
      password: Yup.string()
        .min(6, "Must be 6 characters or more")
        .required("Required"),
    }),
    onSubmit: (values) => {
      dispatch(register(values));
    },
  });

  return (
    <div className="h-screen w-full flex items-center justify-center bg-black overflow-hidden relative">
      {/* Background Gradient Blob */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,_#4f46e520,_transparent_50%)] pointer-events-none"></div>

      {/* Decorative Blobs */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-brand/10 rounded-full blur-3xl -z-10 animate-pulse delay-1000"></div>

      <div className="w-full max-w-md p-6 relative z-10 animate-slide-in">
        <div className="glass shadow-2xl rounded-3xl p-8 border border-white/10 relative overflow-hidden">

          {/* Header */}
          <div className="text-center space-y-3 mb-8">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand to-purple-400 tracking-tight">
              Join ChatWave
            </h1>
            <p className="text-text-muted text-sm tracking-wide uppercase">
              Create your account
            </p>
          </div>

          <form onSubmit={formik.handleSubmit} className="space-y-4">
            <div>
              <div className="relative group">
                <User className="absolute left-4 top-3.5 text-text-muted group-focus-within:text-brand transition-colors" size={20} />
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Full Name"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.name}
                  className="w-full bg-black/30 text-white pl-12 pr-4 py-3.5 rounded-xl border border-white/10 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all placeholder:text-text-muted/50"
                />
              </div>
              {formik.touched.name && formik.errors.name && (
                <div className="mt-1 text-xs text-red-400 pl-2">
                  {formik.errors.name}
                </div>
              )}
            </div>

            <div>
              <div className="relative group">
                <Mail className="absolute left-4 top-3.5 text-text-muted group-focus-within:text-brand transition-colors" size={20} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Email Address"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.email}
                  className="w-full bg-black/30 text-white pl-12 pr-4 py-3.5 rounded-xl border border-white/10 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all placeholder:text-text-muted/50"
                />
              </div>
              {formik.touched.email && formik.errors.email && (
                <div className="mt-1 text-xs text-red-400 pl-2">
                  {formik.errors.email}
                </div>
              )}
            </div>

            <div>
              <div className="relative group">
                <Lock className="absolute left-4 top-3.5 text-text-muted group-focus-within:text-brand transition-colors" size={20} />
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Password"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.password}
                  className="w-full bg-black/30 text-white pl-12 pr-4 py-3.5 rounded-xl border border-white/10 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all placeholder:text-text-muted/50"
                />
              </div>
              {formik.touched.password && formik.errors.password && (
                <div className="mt-1 text-xs text-red-400 pl-2">
                  {formik.errors.password}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand hover:bg-brand-soft text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand/20 hover:shadow-brand/40 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4"
            >
              {isLoading ? "Creating Account..." : "Sign Up"}
              {!isLoading && <UserPlus size={20} />}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-text-muted">
              Already have an account?{" "}
              <Link to="/" className="text-brand-soft hover:text-white font-semibold hover:underline transition-all inline-flex items-center gap-1">
                Log in <ArrowRight size={14} />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
