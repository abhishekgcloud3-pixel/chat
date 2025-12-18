'use client'

import Image from 'next/image'

interface UserAvatarProps {
  name?: string
  avatar?: string | null
  email?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function UserAvatar({
  name,
  avatar,
  email,
  size = 'md',
  className = '',
}: UserAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  }

  const sizePixels = {
    sm: 32,
    md: 40,
    lg: 48,
  }

  const getInitials = (nameStr?: string, emailStr?: string): string => {
    const displayName = nameStr || emailStr || ''
    return displayName
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
  }

  const initials = getInitials(name, email)
  const bgColor = `hsl(${initials.charCodeAt(0) * 137.5 % 360}, 70%, 60%)`

  if (avatar) {
    return (
      <Image
        src={avatar}
        alt={name || email || 'User'}
        width={sizePixels[size]}
        height={sizePixels[size]}
        className={`rounded-full object-cover ${className}`}
      />
    )
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-medium text-white ${className}`}
      style={{ backgroundColor: bgColor }}
      title={name || email}
    >
      {initials || '?'}
    </div>
  )
}
