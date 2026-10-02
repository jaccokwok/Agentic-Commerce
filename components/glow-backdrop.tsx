// Soft lime glows shared by every page.

export default function GlowBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute top-[28%] right-[-12%] h-[34rem] w-[34rem] rounded-full bg-lime-300/50 blur-[130px]" />
      <div className="absolute bottom-[-20%] left-[-10%] h-[26rem] w-[26rem] rounded-full bg-lime-200/40 blur-[120px]" />
    </div>
  );
}
