// backend/routes/courseRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { instructorOnly } from "../middleware/roleMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";
import { getStudentCourseProgress } from "../controllers/courseController.js";

import {
  createCourse,
  getCourses,
  addModule,
  enrollCourse,
  getSingleCourse,
  getEnrolledCourses,
  getInstructorCourses,
  getInstructorProfile,
  deleteModule,
  editModule,
  editCourse,
  deleteCourse,
  completeModule,
  addCourseReview,
  getCourseReviews,
  getCourseCertificate
} from "../controllers/courseController.js";

const router = express.Router();

/* ================= PUBLIC ================= */
router.get("/", getCourses);
router.get("/view/:courseId", protect, getSingleCourse);

/* ================= INSTRUCTOR (MUST BE ABOVE PROFILE) ================= */
router.get(
  "/instructor/my-courses",
  protect,
  instructorOnly,
  getInstructorCourses
);

/* ================= PUBLIC INSTRUCTOR PROFILE ================= */
router.get("/instructor/:instructorId", getInstructorProfile);

/* ================= REVIEWS ================= */
router.get("/:courseId/reviews", getCourseReviews);

/* ================= STUDENT ================= */
router.get("/student/enrolled", protect, getEnrolledCourses);
router.get("/student/progress", protect, getStudentCourseProgress);
router.post("/:courseId/enroll", protect, enrollCourse);
router.post("/:courseId/:moduleId/complete", protect, completeModule);
router.post("/:courseId/review", protect, addCourseReview);
router.get("/:courseId/certificate", protect, getCourseCertificate);


/* ================= INSTRUCTOR ================= */
router.post(
  "/create",
  protect,
  instructorOnly,
  upload.single("thumbnail"),
  createCourse
);

router.post("/:courseId/modules", protect, instructorOnly, addModule);
router.delete("/:courseId/module/:moduleId", protect, instructorOnly, deleteModule);
router.put("/:courseId/module/:moduleId", protect, instructorOnly, editModule);

router.put(
  "/:courseId/edit",
  protect,
  instructorOnly,
  upload.single("thumbnail"),
  editCourse
);

router.delete("/:courseId/delete", protect, instructorOnly, deleteCourse);

/* ================= MUST BE LAST ================= */
router.get("/:courseId", protect, getSingleCourse);

export default router;
