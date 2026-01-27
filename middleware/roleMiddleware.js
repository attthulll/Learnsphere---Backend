export const instructorOnly = (req, res, next) => {
    if (req.user.role !== "instructor") {
        return res.status(403).json({ message: "Access denied. Instructors only." });
    }
    next();
};

export const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
};

