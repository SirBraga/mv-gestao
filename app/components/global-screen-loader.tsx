import Image from "next/image"

type GlobalScreenLoaderProps = {
  visible?: boolean
}

export function GlobalScreenLoader({ visible = true }: GlobalScreenLoaderProps) {
  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 backdrop-blur-md">
      <div className="relative overflow-hidden rounded-[32px] border border-white/15 bg-slate-950/85 px-10 py-9 text-white shadow-2xl shadow-indigo-950/40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.24),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.18),transparent_34%)]" />
        <div className="relative flex flex-col items-center gap-5">
          <div className="relative flex h-24 w-24 items-center justify-center">
            <div className="absolute h-24 w-24 rounded-full border border-white/10" />
            <div className="absolute h-18 w-18 rounded-full border border-indigo-400/30 animate-pulse" />
            <div className="absolute animate-spin [animation-duration:3.2s]">
              <div className="h-24 w-24 rounded-full border-2 border-transparent border-t-indigo-300/80 border-r-sky-300/60" />
            </div>
            <div className="relative h-10 w-16 animate-pulse">
              <Image src="/root/logo.png" alt="MV" fill className="object-contain brightness-0 invert" />
            </div>
          </div>

          <h2 className="text-base font-semibold tracking-[0.24em] uppercase text-white/95">Carregando</h2>
        </div>
      </div>
    </div>
  )
}
