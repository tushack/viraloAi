import React from "react";
import { Home, RotateCcw, SearchX, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#08090d] px-4 py-10 text-zinc-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-12rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute right-[-12rem] top-32 h-[28rem] w-[28rem] rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-[-16rem] left-[-8rem] h-[28rem] w-[28rem] rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-4xl">
       

        <Card className="overflow-hidden border-white/10 bg-white/[0.04] shadow-2xl shadow-black/40 backdrop-blur-xl">
          <CardContent className="relative p-6 text-center sm:p-10 lg:p-14">
            <div className="pointer-events-none absolute left-1/2 top-0 h-44 w-44 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 right-0 h-52 w-52 rounded-full bg-violet-500/20 blur-3xl" />

            <div className="relative mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-2xl shadow-cyan-950/30">
              <SearchX className="h-12 w-12 text-cyan-300" />
            </div>

            <div className="relative">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-medium text-cyan-200">
                <Sparkles className="h-4 w-4" />
                Lost in the research engine
              </div>

              <h2 className="text-7xl font-black tracking-tight text-white sm:text-8xl lg:text-9xl">
                404
              </h2>

              <h3 className="mt-5 text-2xl font-semibold tracking-tight text-white sm:text-4xl">
                This page does not exist
              </h3>

              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
                The route you tried to open is not available. Go back to the
                dashboard and continue finding viral YouTube ideas.
              </p>

              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <Button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="h-12 rounded-full bg-cyan-300 px-6 text-sm font-semibold text-black shadow-lg shadow-cyan-500/15 hover:bg-cyan-200"
                >
                  <Home className="h-4 w-4" />
                  Back to Dashboard
                </Button>

                <Button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="h-12 rounded-full border border-white/10 bg-white/[0.05] px-6 text-sm font-medium text-zinc-200 hover:bg-white/[0.1]"
                >
                  <RotateCcw className="h-4 w-4" />
                  Go Back
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Error 404 • Page not found
        </p>
      </div>
    </div>
  );
}