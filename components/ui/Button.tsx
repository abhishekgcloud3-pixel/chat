import { ReactNode } from 'react'
import clsx from 'clsx'

interface ButtonProps {
  children: ReactNode
  className?: string
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary'
}

export default function Button({
  children,
  className,
  disabled = false,
  onClick,
  type = 'button',
  variant = 'primary',
}: ButtonProps) {
  const baseClasses =
    'px-4 py-2 rounded font-medium transition-colors duration-200'
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100',
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={clsx(baseClasses, variants[variant], className)}
    >
      {children}
    </button>
  )
}
