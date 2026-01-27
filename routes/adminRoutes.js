import express from "express";
import User from "../models/User.js";
import Course from "../models/Course.js";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/roleMiddleware.js";



const router = express.Router();

router.get("/stats", protect, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalCourses = await Course.countDocuments();
    const totalStudents = await User.countDocuments({ role: "student" });
    const totalInstructors = await User.countDocuments({ role: "instructor" });

    res.json({
      totalUsers,
      totalCourses,
      totalStudents,
      totalInstructors,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET ALL USERS (ADMIN ONLY)
router.get("/users", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE USER (ADMIN ONLY)
router.delete("/users/:id", protect, adminOnly, async (req, res) => {
  try {
    const userIdToDelete = req.params.id;

    // Prevent self-delete
    if (req.user.id === userIdToDelete) {
      return res.status(400).json({ message: "You cannot delete yourself" });
    }

    const user = await User.findById(userIdToDelete);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent deleting other admins
    if (user.role === "admin") {
      return res.status(403).json({ message: "Cannot delete another admin" });
    }

    await user.deleteOne();
    res.json({ message: "User deleted successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET ALL COURSES (ADMIN)
router.get("/courses", protect, adminOnly, async (req, res) => {
  try {
    const courses = await Course.find()
      .populate("instructor", "name email")
      .populate("category", "name")
      .sort({ createdAt: -1 });

    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE COURSE (ADMIN)
router.delete("/courses/:id", protect, adminOnly, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    await course.deleteOne();
    res.json({ message: "Course deleted successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================= REVIEWS MODERATION (ADMIN) =================

// GET ALL REVIEWS (ADMIN)
router.get("/reviews", protect, adminOnly, async (req, res) => {
  try {
    const courses = await Course.find()
      .populate("instructor", "name")
      .populate("reviews.student", "name email")
      .select("title reviews");

    // flatten reviews
    const allReviews = [];

    courses.forEach((course) => {
      course.reviews.forEach((review) => {
        allReviews.push({
          courseId: course._id,
          courseTitle: course.title,
          reviewId: review._id,
          student: review.student,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt,
        });
      });
    });

    res.json(allReviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE A REVIEW (ADMIN)
router.delete(
  "/reviews/:courseId/:reviewId",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const { courseId, reviewId } = req.params;

      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      course.reviews = course.reviews.filter(
        (r) => r._id.toString() !== reviewId
      );

      // recalc avg rating
      if (course.reviews.length === 0) {
        course.avgRating = 0;
      } else {
        const sum = course.reviews.reduce((s, r) => s + r.rating, 0);
        course.avgRating = sum / course.reviews.length;
      }

      await course.save();
      res.json({ message: "Review removed successfully" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// GET pending instructors
router.get(
  "/instructors/pending",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const instructors = await User.find({
        role: "instructor",
        instructorStatus: "pending",
      }).select("-password");

      res.json(instructors);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// APPROVE instructor
router.put(
  "/instructors/:id/approve",
  protect,
  adminOnly,
  async (req, res) => {
    await User.findByIdAndUpdate(req.params.id, {
      instructorStatus: "approved",
    });

    res.json({ message: "Instructor approved" });
  }
);

// REJECT instructor
router.put(
  "/instructors/:id/reject",
  protect,
  adminOnly,
  async (req, res) => {
    await User.findByIdAndUpdate(req.params.id, {
      instructorStatus: "rejected",
    });

    res.json({ message: "Instructor rejected" });
  }
);


export default router;
