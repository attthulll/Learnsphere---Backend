import mongoose from "mongoose";

const moduleSchema = new mongoose.Schema({
  title: String,
  videoUrl: String,
  pdfUrl: String,
});

const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  thumbnail: String,

  category: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Category",
  default: null, // VERY IMPORTANT (old courses safe)
},

  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  modules: [moduleSchema],
  students: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  reviews: [
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
],

avgRating: {
  type: Number,
  default: 0,
},

});


export default mongoose.model("Course", courseSchema);
