const express = require("express");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const Photo = require("../db/photoModel");
const User = require("../db/userModel");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const userModel = require("../db/userModel");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user_id = decoded.user_id;
    req.login_name = decoded.login_name;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../public/images");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// GET /photosOfUser/:id - Return photos of a specific user with comments
router.get("/user/:id", requireAuth, async (request, response) => {
  const userId = request.params.id;

  try {
    const user = await User.findById(userId).exec();
    if (!user) {
      response.status(400).json({ error: "User not found" });
      return;
    }

    const photos = await Photo.find({ user_id: userId })
      .select("_id user_id comments file_name date_time")
      .exec();

    const processedPhotos = await Promise.all(
      photos.map(async (photo) => {
        const photoObj = photo.toObject();

        if (photoObj.comments && photoObj.comments.length > 0) {
          photoObj.comments = await Promise.all(
            photoObj.comments.map(async (comment) => {
              const commentUser = await User.findById(comment.user_id)
                .select("_id first_name last_name")
                .exec();

              return {
                _id: comment._id,
                comment: comment.comment,
                date_time: comment.date_time,
                user: commentUser ? commentUser.toObject() : null,
              };
            })
          );
        }

        return photoObj;
      })
    );

    response.status(200).json(processedPhotos);
  } catch (error) {
    console.error("Error fetching photos:", error);
    response.status(400).json({ error: "Invalid user ID" });
  }
});

// POST /commentsOfPhoto/:photo_id - Add a comment to a photo
router.post(
  "/commentsOfPhoto/:photo_id",
  requireAuth,
  async (request, response) => {
    const photoId = request.params.photo_id;
    const { comment } = request.body;

    if (!comment || comment.trim() === "") {
      return response.status(400).json({ error: "Comment cannot be empty" });
    }

    try {
      const photo = await Photo.findById(photoId).exec();
      if (!photo) {
        return response.status(400).json({ error: "Photo not found" });
      }

      const newComment = {
        comment: comment.trim(),
        user_id: request.user_id,
        date_time: new Date(),
      };

      photo.comments.push(newComment);
      await photo.save();

      response.status(200).json({ message: "Comment added successfully" });
    } catch (error) {
      console.error("Error adding comment:", error);
      response.status(400).json({ error: "Error adding comment" });
    }
  }
);

// POST /photos/new - Upload a new photo
router.post(
  "/new",
  requireAuth,
  upload.single("photo"),
  async (request, response) => {
    if (!request.file) {
      return response.status(400).json({ error: "No file uploaded" });
    }

    try {
      const newPhoto = new Photo({
        file_name: request.file.filename,
        user_id: request.user_id,
        date_time: new Date(),
        comments: [],
      });

      await newPhoto.save();
      response
        .status(200)
        .json({ message: "Photo uploaded successfully", photo: newPhoto });
    } catch (error) {
      console.error("Error uploading photo:", error);
      response.status(400).json({ error: "Error uploading photo" });
    }
  }
);

router.put(
  "/commentsOfPhoto/:photo_id/:comment_id",
  requireAuth,
  async (request, response) => {
    const { photo_id, comment_id } = request.params;
    const { comment } = request.body;

    if (!comment || comment.trim() === "") {
      return response.status(400).json({ error: "Comment cannot be empty" });
    }

    try {
      const photo = await Photo.findById(photo_id).exec();
      if (!photo) {
        return response.status(400).json({ error: "Photo not found" });
      }

      const commentToUpdate = photo.comments.id(comment_id);
      if (!commentToUpdate) {
        return response.status(400).json({ error: "Comment not found" });
      }

      if (commentToUpdate.user_id.toString() !== request.user_id) {
        return response.status(403).json({ error: "Forbidden" });
      }

      commentToUpdate.comment = comment.trim();
      await photo.save();

      response.status(200).json({ message: "Comment updated successfully" });
    } catch (error) {
      console.error("Error updating comment:", error);
      response.status(400).json({ error: "Error updating comment" });
    }
  }
);

router.delete(
  "/commentsOfPhoto/:photo_id/:comment_id",
  requireAuth,
  async (request, response) => {
    const { photo_id, comment_id } = request.params;

    try {
      const photo = await Photo.findById(photo_id).exec();
      if (!photo) {
        return response.status(400).json({ error: "Photo not found" });
      }

      const commentToDelete = photo.comments.id(comment_id);
      if (!commentToDelete) {
        return response.status(400).json({ error: "Comment not found" });
      }

      if (commentToDelete.user_id.toString() !== request.user_id) {
        return response.status(403).json({ error: "Forbidden" });
      }

      photo.comments.pull(comment_id);
      await photo.save();

      response.status(200).json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Error deleting comment:", error);
      response.status(400).json({ error: "Error deleting comment" });
    }
  }
);

router.delete("/:photo_id", requireAuth, async (request, response) => {
  const { photo_id } = request.params;

  try {
    const photo = await Photo.findById(photo_id).exec();
    if (!photo) {
      return response.status(400).json({ error: "Photo not found" });
    }

    if (photo.user_id.toString() !== request.user_id) {
      return response.status(403).json({ error: "Forbidden" });
    }

    const filePath = path.join(__dirname, "../public/images", photo.file_name);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Photo.findByIdAndDelete(photo_id);

    response.status(200).json({ message: "Photo deleted successfully" });
  } catch (error) {
    console.error("Error deleting photo:", error);
    response.status(400).json({ error: "Error deleting photo" });
  }
});

router.get("/commentsOf/:userId", requireAuth, async (request, response) => {
  const { userId } = request.params;

  try {
    const user = await userModel.findById(userId).exec();
    if (!user) {
      return response.status(400).json({ error: "User not found" });
    }

    const photos = await Photo.find({ "comments.user_id": userId }).exec();
    comments = [];

    for (const photo of photos) {
      comments.push(...photo.comments);
    }

    response.json(comments);
  } catch (error) {
    console.error("Error", error);
  }
});

module.exports = router;
