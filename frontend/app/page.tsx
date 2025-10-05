import GlitchText from "../components/GlitchText";

export default function HomePage() {
  return (
    <main className="">
      <div className="space-y-2">
        <GlitchText className="text-3xl font-semibold tracking-tight neon-text">Marzban Admin</GlitchText>
        <p className="text-sm text-muted-foreground">برای ورود به سیستم به صفحه ورود بروید.</p>
      </div>
    </main>
  );
}