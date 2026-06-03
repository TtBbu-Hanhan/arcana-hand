import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost'
  children: ReactNode
}

// 仪式感金色按钮
export function RitualButton({ variant = 'primary', children, className = '', ...rest }: ButtonProps) {
  const base =
    'font-serif-zh transition-arcana inline-flex items-center justify-center gap-2 rounded-full px-8 py-3 text-base tracking-wider disabled:cursor-not-allowed disabled:opacity-40'
  const styles =
    variant === 'primary'
      ? 'border border-gold/70 bg-gradient-to-b from-gold/25 to-gold-dark/15 text-gold-light hover:from-gold/40 hover:to-gold-dark/25 hover:shadow-[0_0_22px_rgba(214,181,109,0.5)]'
      : 'border border-gold/30 text-grey-purple hover:border-gold/60 hover:text-gold'
  return (
    <button className={`${base} ${styles} ${className}`} {...rest}>
      {children}
    </button>
  )
}
