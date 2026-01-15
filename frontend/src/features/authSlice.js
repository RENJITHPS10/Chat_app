import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../utils/api";

const storedUser = JSON.parse(sessionStorage.getItem("userInfo"));

const initialState = {
  user: storedUser || null,
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: "",
};

// LOGIN
export const login = createAsyncThunk("auth/login", async (data, thunkAPI) => {
  try {
    const res = await api.post("/auth/login", data);
    sessionStorage.setItem("userInfo", JSON.stringify(res.data));
    return res.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message || error.message
    );
  }
});

// REGISTER
export const register = createAsyncThunk(
  "auth/register",
  async (data, thunkAPI) => {
    try {
      const res = await api.post("/auth/signup", data);
      sessionStorage.setItem("userInfo", JSON.stringify(res.data));
      return res.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

// UPDATE PROFILE ✅
export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (profileData, thunkAPI) => {
    try {
      const res = await api.put("/auth/profile", profileData);
      sessionStorage.setItem("userInfo", JSON.stringify(res.data));
      return res.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

// LOGOUT
export const logout = createAsyncThunk("auth/logout", async () => {
  sessionStorage.removeItem("userInfo");
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    reset: (state) => {
      state.isError = false;
      state.isSuccess = false;
      state.isLoading = false;
      state.message = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
      });
  },
});

export const { reset } = authSlice.actions;
export default authSlice.reducer;
