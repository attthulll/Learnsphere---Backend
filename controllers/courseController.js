// backend/controllers/courseController.js
import mongoose from "mongoose";
import Course from "../models/Course.js";
import User from "../models/User.js";
import Review from "../models/Review.js";
import Category from "../models/Category.js";


// CREATE COURSE
export const createCourse = async (req, res) => {
  try {
    const { title, description, price, category } = req.body;

    const thumbnail = req.file
      ? `/uploads/${req.file.filename}`
      : "";

    let categoryId = null;

    // ✅ HANDLE CATEGORY SAFELY
    if (category) {
      // If ObjectId sent → use directly
      if (mongoose.Types.ObjectId.isValid(category)) {
        categoryId = category;
      } 
      // If name sent → convert to ObjectId
      else {
        const foundCategory = await Category.findOne({ name: category });
        if (!foundCategory) {
          return res.status(400).json({ message: "Invalid category" });
        }
        categoryId = foundCategory._id;
      }
    }

    const course = await Course.create({
      title,
      description,
      price,
      category: categoryId,
      thumbnail,
      instructor: req.user.id,
    });

    res.status(201).json({
      message: "Course created successfully",
      course,
    });

  } catch (err) {
    console.error("Create course error:", err);
    res.status(500).json({ message: err.message });
  }
};


// GET ALL COURSES
export const getCourses = async (req, res) => {
  try {
    const filter = {};

    if (req.query.category) {
      filter.category = req.query.category;
    }

    const courses = await Course.find(filter)
      .populate("instructor", "name email")
      .populate("category", "name")
      .lean();

    // ⭐ ADD AVG RATING SAFELY
    const enrichedCourses = courses.map((course) => {
      const reviews = course.reviews || [];

      const avgRating =
        reviews.length === 0
          ? 0
          : reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

      return {
        ...course,
        avgRating,
        reviewCount: reviews.length,
      };
    });

    res.json(enrichedCourses);
  } catch (err) {
    console.error("Get courses error:", err);
    res.status(500).json({ message: err.message });
  }
};



// GET SINGLE COURSE (robust: accepts different param names)
export const getSingleCourse = async (req, res) => {
  try {
    const id = req.params.courseId || req.params.id || req.params._id || req.query.id;
    if (!id) return res.status(400).json({ message: "Missing course id" });

    const course = await Course.findById(id).populate("instructor", "name email").lean();
    if (!course) return res.status(404).json({ message: "Course not found" });

    let isEnrolled = false;
    if (req.user) {
      isEnrolled = Array.isArray(course.students) && course.students.some(s => s.toString() === req.user.id.toString());
    }

    res.json({ course, isEnrolled });
  } catch (err) {
    console.error("getSingleCourse error:", err);
    res.status(500).json({ message: "Error fetching course" });
  }
};

// ADD MODULE
export const addModule = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, videoUrl, pdfUrl } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    if (course.instructor.toString() !== req.user.id) return res.status(403).json({ message: "Unauthorized" });

    course.modules.push({ title, videoUrl, pdfUrl });
    await course.save();

    res.json({ message: "Module added", modules: course.modules });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ENROLL COURSE
export const enrollCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    if (!course.students.some(s => s.toString() === userId.toString())) {
      course.students.push(userId);
      await course.save();
    }

    const user = await User.findById(userId);
    if (!user.enrolledCourses.some(c => c.toString() === courseId.toString())) {
      user.enrolledCourses.push(courseId);
      await user.save();
    }

    res.json({ message: "Enrolled successfully", course });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET ENROLLED COURSES
export const getEnrolledCourses = async (req, res) => {
  try {
    const courses = await Course.find({ students: req.user.id }).populate("instructor", "name email").lean();
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET INSTRUCTOR COURSES
export const getInstructorCourses = async (req, res) => {
  try {
    const courses = await Course.find({ instructor: req.user.id }).populate("students", "name email").lean();
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// DELETE MODULE
export const deleteModule = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (course.instructor.toString() !== req.user.id) return res.status(403).json({ message: "Unauthorized" });

    course.modules = course.modules.filter(m => m._id.toString() !== moduleId);
    await course.save();
    res.json({ message: "Module deleted", modules: course.modules });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// EDIT MODULE
export const editModule = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const { title, videoUrl, pdfUrl } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (course.instructor.toString() !== req.user.id) return res.status(403).json({ message: "Unauthorized" });

    const module = course.modules.id(moduleId);
    if (!module) return res.status(404).json({ message: "Module not found" });

    module.title = title ?? module.title;
    module.videoUrl = videoUrl ?? module.videoUrl;
    module.pdfUrl = pdfUrl ?? module.pdfUrl;

    await course.save();
    res.json({ message: "Module updated", module });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// EDIT COURSE
export const editCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description, price, category } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (title !== undefined) course.title = title;
    if (description !== undefined) course.description = description;
    if (price !== undefined) course.price = price;

    // ⭐ CATEGORY: only accept valid ObjectId
    if (category !== undefined) {
      if (mongoose.Types.ObjectId.isValid(category)) {
        course.category = category;
      } else {
        // ignore invalid category values (like name strings)
        console.warn("Invalid category value ignored:", category);
      }
    }

    if (req.file) {
      course.thumbnail = `/uploads/${req.file.filename}`;
    }

    await course.save();

    res.json({ message: "Course updated successfully", course });
  } catch (err) {
    console.error("Edit course error:", err);
    res.status(500).json({ message: err.message });
  }
};


// DELETE COURSE
export const deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    if (course.instructor.toString() !== req.user.id)
      return res.status(403).json({ message: "Unauthorized" });

    await Course.findByIdAndDelete(courseId);

    res.json({ message: "Course deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// COMPLETE MODULE
export const completeModule = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const exists = user.completedModules.some(
      m => m.courseId.toString() === courseId && m.moduleId.toString() === moduleId
    );
    if (exists) return res.json({ message: "Already completed" });

    user.completedModules.push({ courseId, moduleId, completedAt: new Date() });
    await user.save();

    res.json({ message: "Module marked completed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getStudentCourseProgress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const enrolledCourseIds = user.enrolledCourses.map(id => id.toString());

    const courses = await Course.find({
      _id: { $in: enrolledCourseIds }
    }).lean();

    const response = courses.map(course => {
      const totalModules = course.modules.length;
      const completed = user.completedModules.filter(
        m => m.courseId.toString() === course._id.toString()
      ).length;

      const progress = totalModules === 0
        ? 0
        : Math.round((completed / totalModules) * 100);

      return {
        courseId: course._id.toString(),
        progress,
        completedModules: user.completedModules
          .filter(m => m.courseId.toString() === course._id.toString())
          .map(m => m.moduleId.toString())
      };
    });

    res.json(response);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};




export const getInstructorProfile = async (req, res) => {
  try {
    const { instructorId } = req.params;

    // ✅ SAFETY CHECK
    if (!mongoose.Types.ObjectId.isValid(instructorId)) {
      return res.status(400).json({ message: "Invalid instructor ID" });
    }

    const instructor = await User.findById(instructorId).select("name role");
    if (!instructor || instructor.role !== "instructor") {
      return res.status(404).json({ message: "Instructor not found" });
    }

    const courses = await Course.find({ instructor: instructorId }).lean();

    const totalStudents = courses.reduce(
      (sum, c) => sum + (c.students?.length || 0),
      0
    );

    res.json({
      instructor,
      courses,
      totalStudents,
    });
  } catch (err) {
    console.error("Instructor profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const addCourseReview = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // prevent duplicate review
    const alreadyReviewed = course.reviews.find(
      (r) => r.student.toString() === userId
    );

    if (alreadyReviewed) {
      return res.status(400).json({ message: "Already reviewed" });
    }

    course.reviews.push({
      student: userId,
      rating,
      comment,
    });

    // ⭐ recompute avg rating
    const total = course.reviews.reduce((sum, r) => sum + r.rating, 0);
    course.avgRating = total / course.reviews.length;

    await course.save();

    res.json({
      message: "Review added",
      avgRating: course.avgRating,
      reviewCount: course.reviews.length,
    });
  } catch (err) {
    console.error("Add review error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



// ADD REVIEW
export const addReview = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    // must be enrolled
    const course = await Course.findById(courseId);
    if (!course.students.includes(userId)) {
      return res.status(403).json({ message: "Enroll to review" });
    }

    const review = await Review.create({
      course: courseId,
      student: userId,
      rating,
      comment,
    });

    res.status(201).json(review);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Already reviewed" });
    }
    res.status(500).json({ message: err.message });
  }
};

// GET COURSE REVIEWS
export const getCourseReviews = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId)
      .populate("reviews.student", "name")
      .select("reviews avgRating");

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json({
      reviews: course.reviews,
      avgRating: course.avgRating,
    });
  } catch (err) {
    console.error("Get reviews error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= CERTIFICATE =================
export const getCourseCertificate = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const course = await Course.findById(courseId)
      .populate("instructor", "name")
      .lean();

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Check enrollment
    if (!course.students.some(s => s.toString() === userId)) {
      return res.status(403).json({ message: "Not enrolled" });
    }

    const user = await User.findById(userId).lean();

    // Progress calculation (REUSE existing logic)
    const totalModules = course.modules.length;
    const completedModules = user.completedModules.filter(
      m => m.courseId.toString() === courseId
    ).length;

    const progress =
      totalModules === 0 ? 0 : Math.round((completedModules / totalModules) * 100);

    if (progress !== 100) {
      return res.status(403).json({ message: "Course not completed" });
    }

    res.json({
      studentName: user.name,
      courseTitle: course.title,
      instructorName: course.instructor?.name || "Instructor",
      completedAt: new Date(),
    });
  } catch (err) {
    console.error("Certificate error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

