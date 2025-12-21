const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../db/userModel");
const router = express.Router();
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;

// POST /admin/login - Login a user
router.post("/login", async (request, response) => {
  const { login_name, password } = request.body;

  if (!login_name || !password) {
    return response
      .status(400)
      .json({ error: "Login name and password are required" });
  }

  try {
    const user = await User.findOne({ login_name }).exec();

    if (!user) {
      return response.status(400).json({ error: "Invalid login credentials" });
    }

    if (user.password !== password) {
      return response.status(400).json({ error: "Invalid login credentials" });
    }

    const token = jwt.sign(
      {
        user_id: user._id,
        login_name: user.login_name,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
    const userResponse = {
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      login_name: user.login_name,
      token: token,
    };

    response.status(200).json(userResponse);
  } catch (error) {
    console.error("Error during login:", error);
    response.status(500).json({ error: "Internal server error" });
  }
});

// POST /admin/logout - Logout a user
router.post("/logout", async (request, response) => {
  response.status(200).json({ message: "Logout successful" });
});

module.exports = router;
