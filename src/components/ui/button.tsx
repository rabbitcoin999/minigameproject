'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useSound } from '@/lib/sound/sound-context'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

const variants = {
  primary:
    'bg-primary-500 text-white hover:bg-primary-600 disabled:bg-primary-800 disabled:text-primary-300/50',
  secondary:
    'bg-dark-800 text-dark-100 hover:bg-dark-700 border border-dark-700 disabled:opacity-50',
  ghost: 'bg-transparent text-dark-300 hover:bg-dark-800 hover:text-white disabled:opacity-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const { play } = useSound()

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) play('click')
    onClick?.(e)
  }

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
