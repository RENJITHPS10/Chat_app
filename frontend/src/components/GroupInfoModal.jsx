import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { X, ShieldCheck, LogOut } from "lucide-react";
import { leaveGroup } from "../features/chatSlice";

/**
 * GroupInfoModal
 * Displays the list of members in a group chat.
 */
const GroupInfoModal = ({ chat, onClose }) => {
    const dispatch = useDispatch();
    const { onlineUsers } = useSelector((state) => state.chat);
    const { user: loggedInUser } = useSelector((state) => state.auth);

    if (!chat) return null;

    const handleLeave = () => {
        if (window.confirm(`Are you sure you want to leave ${chat.chatName}?`)) {
            dispatch(leaveGroup({ chatId: chat._id, userId: loggedInUser._id }));
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-slide-in">
            <div className="glass shadow-glass p-8 rounded-3xl w-full max-w-md border border-white/10 relative overflow-hidden">

                {/* Decorative Gradient Blob */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand/10 rounded-full blur-3xl -z-10 animate-pulse"></div>

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-2xl text-white font-bold tracking-tight">Group Members</h3>
                        <p className="text-text-muted text-sm">{chat.users.length} people in "{chat.chatName}"</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 text-text-muted hover:text-white transition-all shadow-lg active:scale-95"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Members List */}
                <div className="max-h-72 overflow-y-auto custom-scrollbar pr-2 space-y-3 mb-6">
                    {chat.users.map((member) => {
                        const isOnline = onlineUsers.includes(member._id);
                        const isAdmin = chat.groupAdmin?._id === member._id || chat.groupAdmin === member._id;

                        return (
                            <div
                                key={member._id}
                                className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-brand/30 hover:bg-brand/5 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <img
                                            src={member.pic}
                                            className={`h-12 w-12 rounded-full object-cover border-2 ${isOnline ? 'border-success' : 'border-white/10'}`}
                                            alt={member.name}
                                        />
                                        {isOnline && (
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-black"></div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-white font-medium group-hover:text-brand-soft transition-colors text-sm">
                                            {member.name} {member._id === loggedInUser?._id && <span className="text-text-muted text-xs font-normal ml-1">(You)</span>}
                                        </p>
                                        <p className="text-[10px] text-text-muted uppercase tracking-tight">{isOnline ? 'Online' : 'Offline'}</p>
                                    </div>
                                </div>

                                {isAdmin && (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-brand/20 rounded-full border border-brand/30">
                                        <ShieldCheck size={14} className="text-brand-soft" />
                                        <span className="text-[10px] text-brand-soft font-bold uppercase tracking-wider">Admin</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer Actions */}
                <div className="pt-4 border-t border-white/10">
                    <button
                        onClick={handleLeave}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-danger/10 hover:bg-danger text-danger hover:text-white border border-danger/20 hover:border-danger/50 transition-all font-bold active:scale-[0.98] group"
                    >
                        <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span>Leave Group</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GroupInfoModal;
