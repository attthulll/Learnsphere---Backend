import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: {
      type: String,
      enum: ["student", "instructor", "admin"],
      default: "student",
    },

    instructorStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: null, // students & admins unaffected
    },

    enrolledCourses: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    ],

    completedModules: [
      {
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
        moduleId: { type: mongoose.Schema.Types.ObjectId },
        completedAt: Date,
      },
    ],
  },
  {
    timestamps: true, // ✅ THIS IS THE ONLY ADDITION
  }
);

export default mongoose.model("User", userSchema);
