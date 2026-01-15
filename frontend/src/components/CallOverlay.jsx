import React, { useEffect, useState } from "react";
import { PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";

const CallOverlay = ({ name, type, onEnd }) => {
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60
  ).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 bg-black z-[999] flex flex-col justify-between items-center text-white">
      <div className="mt-10 text-center">
        <p className="text-xl font-semibold">{name}</p>
        <p className="text-gray-400">{time}</p>
      </div>

      {type === "video" && (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Video stream here
        </div>
      )}

      <div className="mb-12 flex gap-6">
        <button
          onClick={() => setMuted(!muted)}
          className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center"
        >
          {muted ? <MicOff /> : <Mic />}
        </button>

        {type === "video" && (
          <button
            onClick={() => setVideoOff(!videoOff)}
            className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center"
          >
            {videoOff ? <VideoOff /> : <Video />}
          </button>
        )}

        <button
          onClick={onEnd}
          className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center"
        >
          <PhoneOff />
        </button>
      </div>
    </div>
  );
};

export default CallOverlay;
