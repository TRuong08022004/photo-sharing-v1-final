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
      .select("_id user_id comments file_name date_time likes")
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

        photoObj.like_count = (photo.likes || []).length;
        photoObj.is_liked = (photo.likes || []).some(
          (likerId) => likerId.toString() === request.user_id
        );

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

// POST /photo/:photo_id/like - Toggle like on a photo
router.post("/:photo_id/like", requireAuth, async (request, response) => {
  const { photo_id } = request.params;

  try {
    const photo = await Photo.findById(photo_id).select("likes").exec();
    if (!photo) {
      return response.status(400).json({ error: "Photo not found" });
    }

    const likedAlready = (photo.likes || []).some(
      (likerId) => likerId.toString() === request.user_id
    );

    if (likedAlready) {
      photo.likes = photo.likes.filter(
        (likerId) => likerId.toString() !== request.user_id
      );
    } else {
      photo.likes.push(request.user_id);
    }

    await photo.save();

    return response.status(200).json({
      like_count: (photo.likes || []).length,
      is_liked: !likedAlready,
    });
  } catch (error) {
    console.error("Error toggling like:", error);
    response.status(500).json({ error: "Error toggling like" });
  }
});

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

// GET /photo/comments/search?q=... - Search comments by text or commenter name/login
router.get("/comments/search", requireAuth, async (request, response) => {
  const searchTerm = (request.query.q || "").trim();

  if (!searchTerm) {
    return response.status(200).json([]);
  }

  try {
    const matchRegex = new RegExp(searchTerm, "i");

    // Find users whose names/login match; helps search by commenter identity.
    const matchingUsers = await User.find({
      $or: [
        { first_name: matchRegex },
        { last_name: matchRegex },
        { login_name: matchRegex },
        { occupation: matchRegex },
        { location: matchRegex },
      ],
    })
      .select("_id first_name last_name")
      .lean();

    const matchingUserIds = matchingUsers.map((u) => u._id);

    // Find photos that contain comments matching text or from matching users.
    const photosWithMatches = await Photo.find({
      comments: {
        $elemMatch: {
          $or: [{ comment: matchRegex }, { user_id: { $in: matchingUserIds } }],
        },
      },
    }).lean();

    // Collect all user ids needed (commenters + photo owners + matched users)
    const userIdsNeeded = new Set(matchingUserIds.map((id) => id.toString()));
    photosWithMatches.forEach((photo) => {
      if (photo.user_id) userIdsNeeded.add(photo.user_id.toString());
      (photo.comments || []).forEach((comment) => {
        if (comment.user_id) userIdsNeeded.add(comment.user_id.toString());
      });
    });

    const users = await User.find({ _id: { $in: Array.from(userIdsNeeded) } })
      .select("_id first_name last_name")
      .lean();
    const userMap = new Map(
      users.map((user) => [user._id.toString(), user])
    );

    const results = [];
    photosWithMatches.forEach((photo) => {
      (photo.comments || []).forEach((comment) => {
        const commenterId = comment.user_id ? comment.user_id.toString() : "";
        const matchesText = matchRegex.test(comment.comment || "");
        const matchesUser = matchingUserIds.some(
          (id) => id.toString() === commenterId
        );

        if (matchesText || matchesUser) {
          results.push({
            _id: comment._id,
            comment: comment.comment,
            date_time: comment.date_time,
            user: userMap.get(commenterId) || null,
            photo: {
              _id: photo._id,
              file_name: photo.file_name,
              user_id: photo.user_id,
              owner: userMap.get(photo.user_id?.toString()) || null,
              like_count: (photo.likes || []).length,
              is_liked: (photo.likes || []).some(
                (likerId) => likerId.toString() === request.user_id
              ),
            },
          });
        }
      });
    });

    response.status(200).json(results);
  } catch (error) {
    console.error("Error searching comments:", error);
    response.status(500).json({ error: "Internal server error" });
  }
});

// GET /photo/search?q=... - Search photos by file name, poster name, or comment text
router.get("/search", requireAuth, async (request, response) => {
  const searchTerm = (request.query.q || "").trim();

  if (!searchTerm) {
    return response.status(200).json([]);
  }

  try {
    const matchRegex = new RegExp(searchTerm, "i");

    // Find users whose names/login match to widen search to their photos
    const matchingUsers = await User.find({
      $or: [
        { first_name: matchRegex },
        { last_name: matchRegex },
        { login_name: matchRegex },
        { occupation: matchRegex },
        { location: matchRegex },
      ],
    })
      .select("_id first_name last_name")
      .lean();

    const matchingUserIds = matchingUsers.map((u) => u._id);

    const photos = await Photo.find({
      $or: [
        { file_name: matchRegex },
        { user_id: { $in: matchingUserIds } },
        { "comments.comment": matchRegex },
      ],
    })
      .sort({ date_time: -1 })
      .lean();

    const userMap = new Map();
    [...matchingUsers, ...(await User.find({}).select("_id first_name last_name").lean())].forEach(
      (user) => userMap.set(user._id.toString(), user)
    );

    const enrichedPhotos = photos.map((photo) => {
      const owner = userMap.get(photo.user_id?.toString());
      const comments = (photo.comments || []).map((comment) => ({
        ...comment,
        user: userMap.get(comment.user_id?.toString()) || null,
      }));

      return {
        ...photo,
        user: owner || null,
        comments,
        like_count: (photo.likes || []).length,
        is_liked: (photo.likes || []).some(
          (likerId) => likerId.toString() === request.user_id
        ),
      };
    });

    response.status(200).json(enrichedPhotos);
  } catch (error) {
    console.error("Error searching photos:", error);
    response.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
