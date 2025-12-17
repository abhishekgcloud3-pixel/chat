import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  email: string
  passwordHash?: string
  mobileNumber?: string
  name?: string
  avatar?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: false, // Optional for future use
    },
    mobileNumber: {
      type: String,
      required: false,
      trim: true,
    },
    name: {
      type: String,
      required: false,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    avatar: {
      type: String,
      required: false,
      match: [/^https?:\/\/.+/, 'Please provide a valid URL'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes for performance
UserSchema.index({ email: 1 })
UserSchema.index({ mobileNumber: 1 })

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)