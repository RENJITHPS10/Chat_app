import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createGroupChat } from "../features/chatSlice";
import { X } from "lucide-react";
import api from "../utils/api";

const GroupChatModal = ({ onClose }) => {
    const dispatch = useDispatch();
    const [groupName, setGroupName] = useState("");
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [search, setSearch] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (query) => {
        setSearch(query);
        if (!query) {
            setSearchResults([]);
            return;
        }

        try {
            setLoading(true);
            const { data } = await api.get(`/auth/users?search=${query}`);
            setLoading(false);
            setSearchResults(data);
        } catch (error) {
            setLoading(false);
            console.error("Failed to fetch users", error);
        }
    };

    const
        handleGroup = (userToAdd) => {
            if (selectedUsers.includes(userToAdd)) {
                // toast warning
                return;
            }
            setSelectedUsers([...selectedUsers, userToAdd]);
        };

    const handleDelete = (delUser) => {
        setSelectedUsers(selectedUsers.filter((sel) => sel._id !== delUser._id));
    };

    const handleSubmit = () => {
        if (!groupName || selectedUsers.length < 2) {
            alert("Please enter a group name and select at least 2 users");
            return;
        }

        dispatch(createGroupChat({ name: groupName, users: JSON.stringify(selectedUsers.map((u) => u._id)) }));
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-lg flex items-center justify-center z-50 animate-slide-in">
            <div className="glass shadow-glass p-8 rounded-2xl w-full max-w-md border border-white/10 relative overflow-hidden">
                {/* Decorative Gradient Blob */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand/20 rounded-full blur-3xl -z-10 translate-x-10 -translate-y-10"></div>

                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl text-white font-bold tracking-tight">Create Group Chat</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition"><X className="text-text-muted hover:text-white" /></button>
                </div>

                <div className="flex flex-col gap-5 relative z-10">
                    <input
                        placeholder="Group Name"
                        className="bg-black/30 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/50 border border-white/5 placeholder:text-text-muted/50 transition-all"
                        onChange={(e) => setGroupName(e.target.value)}
                    />

                    <input
                        placeholder="Add Users eg: John, Jane"
                        className="bg-black/30 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/50 border border-white/5 placeholder:text-text-muted/50 transition-all"
                        onChange={(e) => handleSearch(e.target.value)}
                    />

                    <div className="flex flex-wrap gap-2">
                        {selectedUsers.map((u) => (
                            <div key={u._id} className="bg-brand/20 border border-brand/30 text-brand-soft px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2">
                                {u.name}
                                <X size={14} className="cursor-pointer hover:text-white" onClick={() => handleDelete(u)} />
                            </div>
                        ))}
                    </div>

                    <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                        {loading ? (
                            <div className="text-text-muted text-center text-sm py-4">Loading users...</div>
                        ) : (
                            searchResults?.slice(0, 4).map((user) => (
                                <div
                                    key={user._id}
                                    onClick={() => handleGroup(user)}
                                    className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition border border-transparent hover:border-white/5"
                                >
                                    <img src={user.pic} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                                    <div className="text-white text-sm">
                                        <p className="font-medium">{user.name}</p>
                                        <p className="text-xs text-text-muted">{user.email}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <button
                        onClick={handleSubmit}
                        className="bg-brand hover:bg-brand-soft text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand/20 hover:shadow-brand/40 transition-all active:scale-95 mt-2"
                    >
                        Create Chat
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GroupChatModal;
