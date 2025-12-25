const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../db/userModel");
const router = express.Router();
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;

// Authentication middleware
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user_id = decoded.user_id;
    req.login_name = decoded.login_name;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

// GET /user/list - Return list of users for navigation sidebar
router.get("/list", requireAuth, async (request, response) => {
  try {
    const Photo = require("../db/photoModel");
    const users = await User.find({})
      .select("_id first_name last_name friends")
      .exec();

    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const photos = await Photo.find({ user_id: user._id }).exec();
        const photoCount = photos.length;

        let commentCount = 0;
        const allPhotos = await Photo.find({}).exec();
        allPhotos.forEach((photo) => {
          photo.comments.forEach((comment) => {
            if (comment.user_id.toString() === user._id.toString()) {
              commentCount++;
            }
          });
        });

        return {
          _id: user._id,
          first_name: user.first_name,
          last_name: user.last_name,
          photo_count: photoCount,
          comment_count: commentCount,
          friend_count: (user.friends || []).length,
          is_friend: (user.friends || []).some(
            (friendId) => friendId.toString() === request.user_id
          ),
        };
      })
    );

    response.status(200).json(usersWithStats);
  } catch (error) {
    console.error("Error fetching user list:", error);
    response.status(500).json({ error: "Internal server error" });
  }
});

// GET /user/search?q=... - Search users by name/login and include stats
router.get("/search", requireAuth, async (request, response) => {
  const searchTerm = (request.query.q || "").trim();

  if (!searchTerm) {
    // Empty query returns an empty array to keep UI predictable
    return response.status(200).json([]);
  }

  try {
    const Photo = require("../db/photoModel");
    const matchRegex = new RegExp(searchTerm, "i");

    // Find matching users
    const matchedUsers = await User.find({
      $or: [
        { first_name: matchRegex },
        { last_name: matchRegex },
        { login_name: matchRegex },
        { occupation: matchRegex },
        { location: matchRegex },
      ],
    })
      .select("_id first_name last_name friends")
      .exec();

    // Pre-compute photo and comment counts to avoid repeated queries
    const allPhotos = await Photo.find({}).exec();
    const photoCounts = {};
    const commentCounts = {};
    allPhotos.forEach((photo) => {
      const ownerId = photo.user_id?.toString();
      if (ownerId) {
        photoCounts[ownerId] = (photoCounts[ownerId] || 0) + 1;
      }
      (photo.comments || []).forEach((comment) => {
        const commenterId = comment.user_id?.toString();
        if (commenterId) {
          commentCounts[commenterId] = (commentCounts[commenterId] || 0) + 1;
        }
      });
    });

    const usersWithStats = matchedUsers.map((user) => {
      const id = user._id.toString();
      return {
        _id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        photo_count: photoCounts[id] || 0,
        comment_count: commentCounts[id] || 0,
        friend_count: (user.friends || []).length,
        is_friend: (user.friends || []).some(
          (friendId) => friendId.toString() === request.user_id
        ),
      };
    });

    response.status(200).json(usersWithStats);
  } catch (error) {
    console.error("Error searching users:", error);
    response.status(500).json({ error: "Internal server error" });
  }
});

// GET /user/:id/friends - Return a user's friends (basic info only)
router.get("/:id/friends", requireAuth, async (request, response) => {
  const userId = request.params.id;

  try {
    const user = await User.findById(userId)
      .select("friends")
      .populate("friends", "_id first_name last_name login_name")
      .exec();

    if (!user) {
      return response.status(400).json({ error: "User not found" });
    }

    const friends = (user.friends || []).map((friend) => ({
      _id: friend._id,
      first_name: friend.first_name,
      last_name: friend.last_name,
      login_name: friend.login_name,
    }));

    response.status(200).json(friends);
  } catch (error) {
    console.error("Error fetching friends:", error);
    response.status(500).json({ error: "Internal server error" });
  }
});

// GET /user/:id - Return detailed information of a specific user
router.get("/:id", requireAuth, async (request, response) => {
  const userId = request.params.id;

  try {
    const Photo = require("../db/photoModel");
    const user = await User.findById(userId).select("-password");

    if (!user) {
      response.status(400).json({ error: "User not found" });
      return;
    }

    const photos = await Photo.find({ user_id: userId }).exec();
    const photoCount = photos.length;

    let commentCount = 0;
    const allPhotos = await Photo.find({}).exec();
    allPhotos.forEach((photo) => {
      photo.comments.forEach((comment) => {
        if (comment.user_id.toString() === userId) {
          commentCount++;
        }
      });
    });

    const userWithStats = {
      ...user.toObject(),
      photo_count: photoCount,
      comment_count: commentCount,
      friend_count: (user.friends || []).length,
      is_friend: (user.friends || []).some(
        (friendId) => friendId.toString() === request.user_id
      ),
    };

    response.status(200).json(userWithStats);
  } catch (error) {
    console.error("Error fetching user:", error);
    response.status(400).json({ error: "Invalid user ID" });
  }
});

// POST /user - Register a new user
router.post("/", async (request, response) => {
  const {
    login_name,
    password,
    first_name,
    last_name,
    location,
    description,
    occupation,
  } = request.body;

  // Validate required fields
  if (!login_name || !password || !first_name || !last_name) {
    return response.status(400).json({
      error: "login_name, password, first_name, and last_name are required",
    });
  }

  // Check if fields are non-empty strings
  if (
    login_name.trim() === "" ||
    password.trim() === "" ||
    first_name.trim() === "" ||
    last_name.trim() === ""
  ) {
    return response.status(400).json({
      error:
        "login_name, password, first_name, and last_name must be non-empty",
    });
  }

  try {
    // Check if login_name already exists
    const existingUser = await User.findOne({ login_name }).exec();
    if (existingUser) {
      return response.status(400).json({ error: "login_name already exists" });
    }

    // Create new user (in production, hash the password with bcrypt)
    const newUser = new User({
      login_name,
      password,
      first_name,
      last_name,
      location: location || "",
      description: description || "",
      occupation: occupation || "",
    });

    await newUser.save();

    // Return login_name as required by tests
    response.status(200).json({ login_name: newUser.login_name });
  } catch (error) {
    console.error("Error creating user:", error);
    response.status(400).json({ error: "Error creating user" });
  }
});

// POST /user/friends/:id - Add a friend (symmetric)
router.post("/friends/:id", requireAuth, async (request, response) => {
  const targetUserId = request.params.id;
  const currentUserId = request.user_id;

  if (targetUserId === currentUserId) {
    return response
      .status(400)
      .json({ error: "You cannot add yourself as a friend" });
  }

  try {
    const [currentUser, targetUser] = await Promise.all([
      User.findById(currentUserId).select("friends").exec(),
      User.findById(targetUserId).select("friends").exec(),
    ]);

    if (!currentUser) {
      return response.status(400).json({ error: "Current user not found" });
    }

    if (!targetUser) {
      return response.status(400).json({ error: "Target user not found" });
    }

    const alreadyFriends = (currentUser.friends || []).some(
      (friendId) => friendId.toString() === targetUserId
    );

    if (!alreadyFriends) {
      currentUser.friends.push(targetUserId);
      targetUser.friends.push(currentUserId);
      await Promise.all([currentUser.save(), targetUser.save()]);
    }

    return response.status(200).json({
      message: "Friend added",
      is_friend: true,
      friend_count: (targetUser.friends || []).length,
    });
  } catch (error) {
    console.error("Error adding friend:", error);
    response.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /user/friends/:id - Remove a friend (symmetric)
router.delete("/friends/:id", requireAuth, async (request, response) => {
  const targetUserId = request.params.id;
  const currentUserId = request.user_id;

  if (targetUserId === currentUserId) {
    return response
      .status(400)
      .json({ error: "You cannot unfriend yourself" });
  }

  try {
    const [currentUser, targetUser] = await Promise.all([
      User.findById(currentUserId).select("friends").exec(),
      User.findById(targetUserId).select("friends").exec(),
    ]);

    if (!currentUser) {
      return response.status(400).json({ error: "Current user not found" });
    }

    if (!targetUser) {
      return response.status(400).json({ error: "Target user not found" });
    }

    currentUser.friends = (currentUser.friends || []).filter(
      (friendId) => friendId.toString() !== targetUserId
    );
    targetUser.friends = (targetUser.friends || []).filter(
      (friendId) => friendId.toString() !== currentUserId
    );

    await Promise.all([currentUser.save(), targetUser.save()]);

    return response.status(200).json({
      message: "Friend removed",
      is_friend: false,
      friend_count: (targetUser.friends || []).length,
    });
  } catch (error) {
    console.error("Error removing friend:", error);
    response.status(500).json({ error: "Internal server error" });
  }
});

// PUT /user/:id - Update current user's profile
router.put("/:id", requireAuth, async (request, response) => {
  const userId = request.params.id;
  const currentUserId = request.user_id;

  if (userId !== currentUserId) {
    return response.status(403).json({ error: "Forbidden" });
  }

  const {
    first_name,
    last_name,
    location,
    description,
    occupation,
    login_name,
  } = request.body || {};

  if (!first_name || !last_name || !login_name) {
    return response
      .status(400)
      .json({ error: "first_name, last_name, and login_name are required" });
  }

  if (
    first_name.trim() === "" ||
    last_name.trim() === "" ||
    login_name.trim() === ""
  ) {
    return response
      .status(400)
      .json({ error: "Required fields cannot be empty" });
  }

  try {
    const user = await User.findById(userId).exec();
    if (!user) {
      return response.status(400).json({ error: "User not found" });
    }

    if (login_name !== user.login_name) {
      const existing = await User.findOne({ login_name }).exec();
      if (existing && existing._id.toString() !== userId) {
        return response.status(400).json({ error: "login_name already exists" });
      }
    }

    user.first_name = first_name;
    user.last_name = last_name;
    user.location = location || "";
    user.description = description || "";
    user.occupation = occupation || "";
    user.login_name = login_name;

    await user.save();

    const Photo = require("../db/photoModel");
    const photos = await Photo.find({ user_id: userId }).exec();
    const photoCount = photos.length;

    let commentCount = 0;
    const allPhotos = await Photo.find({}).exec();
    allPhotos.forEach((photo) => {
      photo.comments.forEach((comment) => {
        if (comment.user_id.toString() === userId) {
          commentCount++;
        }
      });
    });

    const safeUser = {
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      location: user.location,
      description: user.description,
      occupation: user.occupation,
      login_name: user.login_name,
      photo_count: photoCount,
      comment_count: commentCount,
      friend_count: (user.friends || []).length,
      is_friend: false,
    };

    return response.status(200).json({ user: safeUser });
  } catch (error) {
    console.error("Error updating user:", error);
    response.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
