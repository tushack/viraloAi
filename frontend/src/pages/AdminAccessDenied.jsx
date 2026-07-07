import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, LockKeyhole, ShieldAlert } from "lucide-react";

export default function AdminAccessDenied() {

    const memes = [
        "💀 Bro really thought this would work.",
        "🚫 Access denied. Nice confidence though.",
        "🤨 Authentication said: 'Who even are you?'",
        "🎮 Achievement Locked: Access This Page.",
        "😂 Nice try, future hacker.",
        "🛡️ Server said: 'Not today.'",
        "👀 Admins are watching...",
        "🤡 Bro got humbled by HTTP 403.",
        "😭 Permission level: NPC.",
        "🚪 Knock knock... nobody invited you.",
        "💸 Premium page detected. Wallet not detected.",
        "😎 Bro speedran getting blocked.",
        "🔐 This page has stronger security than your password.",
        "🧙 You shall not pass!",
        "😅 Bro clicked around and found disappointment.",
        "📡 Your request has been respectfully ignored.",
        "🤖 Even AI couldn't convince the server.",
        "🚷 This ain't your page, chief.",
        "🎯 Wrong URL. Right confidence.",
        "🔥 Bro tried Ctrl + Luck."
    ];

    const randomMeme = useMemo(() => {
        return memes[Math.floor(Math.random() * memes.length)];
    }, []);

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050711] px-4 py-10 text-white">

            <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />

                {/* <div className="flex justify-center">
                    <div className="rounded-full bg-red-500/20 p-5">
                        <ShieldAlert size={60} className="text-red-400" />
                    </div>
                </div> */}

                {/* Random Meme */}
                <div className="mt-8 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                    <p className="text-xl font-semibold text-cyan-300">
                        {randomMeme}
                    </p>
                </div>



        </main>
    );
}