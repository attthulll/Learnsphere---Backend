import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ================= REGISTER USER =================
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ prepare user data FIRST
    const userData = {
      name,
      email,
      password: hashedPassword,
      role,
    };

    // 🔒 Instructor registration requires admin approval
    if (role === "instructor") {
      userData.instructorStatus = "pending";
    }

    // create user
    await User.create(userData);

    // custom response for instructor
    if (role === "instructor") {
      return res.status(201).json({
        message: "Instructor request submitted. Await admin approval.",
      });
    }

    res.status(201).json({ message: "User registered successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= LOGIN USER =================
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email" });
    }

    // check password
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // ❌ Block unapproved instructors
   // ❌ Block ONLY new or rejected instructors
if (
  user.role === "instructor" &&
  (user.instructorStatus === "pending" ||
   user.instructorStatus === "rejected")
) {
  return res.status(403).json({
    message:
      user.instructorStatus === "rejected"
        ? "Instructor account was rejected by admin"
        : "Instructor account pending admin approval",
  });
}


    // create token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= GET LOGGED-IN USER =================
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      enrolledCourses: user.enrolledCourses,
      completedModules: user.completedModules,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
