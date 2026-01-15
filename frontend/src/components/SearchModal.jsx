import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { setSelectedChat, fetchChats } from "../features/chatSlice";
import { X, Search } from "lucide-react";
import api from "../utils/api";

const SearchModal = ({ onClose }) => {
    const dispatch = useDispatch();
    const [search, setSearch] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingChat, setLoadingChat] = useState(false);

    const handleSearch = async () => {
        if (!search) return;

        try {
            setLoading(true);
            const { data } = await api.get(`/auth/users?search=${search}`);
            setLoading(false);
            setSearchResults(data);
        } catch (error) {
            setLoading(false);
            console.error("Failed to fetch users", error);
        }
    };

    const accessChat = async (userId) => {
        try {
            setLoadingChat(true);
            const { data } = await api.post("/chat", { userId });

            // If chat already exists in list, fine. If not, we might need to refresh chats
            // logic in backend accessChat returns the chat. 
            // We should append it to chats in redux or just fetchChats again.
            // Easiest is to dispatch fetchChats() to ensure list is updated, then setSelectedChat.

            await dispatch(fetchChats()); // Refresh list to include new chat
            dispatch(setSelectedChat(data));
            setLoadingChat(false);
            onClose();
        } catch (error) {
            setLoadingChat(false);
            console.error("Error accessing chat", error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-lg flex items-center justify-center z-50 animate-slide-in">
            <div className="glass shadow-glass p-8 rounded-2xl w-full max-w-md border border-white/10 relative overflow-hidden">
                {/* Decorative Gradient Blob */}
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand/10 rounded-full blur-3xl -z-10 -translate-x-10 translate-y-10"></div>

                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl text-white font-bold tracking-tight">Search Users</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition"><X className="text-text-muted hover:text-white" /></button>
                </div>

                <div className="flex gap-3 mb-6">
                    <input
                        placeholder="Search by name or email"
                        className="flex-1 bg-black/30 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/50 border border-white/5 placeholder:text-text-muted/50 transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <button
                        onClick={handleSearch}
                        className="bg-brand/20 hover:bg-brand text-brand-soft hover:text-white p-3 rounded-xl border border-brand/30 transition-all active:scale-95"
                    >
                        <Search size={22} />
                    </button>
                </div>

                <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                    {loading ? (
                        <div className="text-text-muted text-center text-sm py-4">Searching...</div>
                    ) : (
                        searchResults.map((user) => (
                            <div
                                key={user._id}
                                onClick={() => accessChat(user._id)}
                                className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition border border-transparent hover:border-white/5 group"
                            >
                                <img src={user.pic} className="w-10 h-10 rounded-full object-cover border border-white/10 group-hover:border-brand/50 transition-colors" />
                                <div className="text-white text-sm">
                                    <p className="font-medium group-hover:text-brand-soft transition-colors">{user.name}</p>
                                    <p className="text-xs text-text-muted">{user.email}</p>
                                </div>
                            </div>
                        ))
                    )}
                    {!loading && searchResults.length === 0 && search && (
                        <div className="text-text-muted text-center text-sm py-4 opacity-70">No users found</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchModal;
