export default function MarketplaceHelperLogo({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <span
      aria-label="Marketplace Helper"
      className={`inline-flex items-center justify-center rounded-xl bg-slate-900 font-bold text-white ${className}`}
    >
      MH
    </span>
  )
}
