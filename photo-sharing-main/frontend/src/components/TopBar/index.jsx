import React, { useState, useEffect } from "react";
import { AppBar, Toolbar, Typography, Button, Box, Input } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import fetchModel from "../../lib/fetchModelData";
import { apiUrl } from "../../config.api";

import "./styles.css";

/**
 * Define TopBar, a React component of Project 4.
 */
function TopBar({ user, onLogout, onPhotoUploaded }) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const [contextMessage, setContextMessage] = useState("Photo Sharing");
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      const userDetailMatch = pathname.match(/\/users\/([^/]+)/);
      const userPhotosMatch = pathname.match(/\/photos\/([^/]+)/);

      let userId;
      if (userDetailMatch) {
        userId = userDetailMatch[1];
        const userData = await fetchModel(`/user/${userId}`);
        if (userData) {
          setContextMessage(`${userData.first_name} ${userData.last_name}`);
        }
      } else if (userPhotosMatch) {
        userId = userPhotosMatch[1];
        const userData = await fetchModel(`/user/${userId}`);
        if (userData) {
          setContextMessage(
            `Photos of ${userData.first_name} ${userData.last_name}`
          );
        }
      } else {
        setContextMessage("Photo Sharing");
      }
    };

    fetchUserData();
  }, [pathname]);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token");
      await fetch(apiUrl("/admin/logout"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      localStorage.removeItem("token");
      onLogout();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
      localStorage.removeItem("token");
      onLogout();
      navigate("/");
    }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadError("");
    const formData = new FormData();
    formData.append("photo", file);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl("/photo/new"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.status === 200) {
        alert("Photo uploaded successfully!");
        if (onPhotoUploaded) {
          onPhotoUploaded();
        }
        // Navigate to user's photos page
        if (user) {
          navigate(`/photos/${user._id}`);
        }
      } else {
        setUploadError("Failed to upload photo");
      }
    } catch (error) {
      console.error("Photo upload failed:", error);
      setUploadError("Failed to upload photo");
    }

    // Reset input
    event.target.value = "";
  };

  return (
    <AppBar className="topbar-appBar" position="absolute">
      <Toolbar style={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="h5" color="inherit">
          B22DCAT128
        </Typography>
        <Typography variant="h5" color="inherit">
          {contextMessage}
        </Typography>
        <Box>
          {user ? (
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="body1" color="inherit">
                Hi {user.first_name}
              </Typography>
              <label htmlFor="photo-upload">
                <Input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: "none" }}
                />
                <Button variant="contained" component="span">
                  Add Photo
                </Button>
              </label>
              <Button
                variant="contained"
                color="secondary"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </Box>
          ) : (
            <Typography variant="body1" color="inherit">
              Please Login
            </Typography>
          )}
        </Box>
      </Toolbar>
      {uploadError && (
        <Typography
          color="error"
          style={{ textAlign: "center", padding: "5px" }}
        >
          {uploadError}
        </Typography>
      )}
    </AppBar>
  );
}

export default TopBar;
