import React, { useState, useEffect } from "react";
import {
  Typography,
  Paper,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Box,
  TextField,
} from "@mui/material";
import { Link, useParams } from "react-router-dom";
import fetchModel from "../../lib/fetchModelData";
import { apiUrl } from "../../config.api";
import {
  ENABLE_FRIEND_FEATURES,
  ENABLE_PROFILE_EDIT_FEATURE,
} from "../../config.features";

import "./styles.css";

/**
 * Define UserDetail, a React component of Project 4.
 */
function UserDetail() {
  const { userId } = useParams();
  const [user, setUser] = useState({});
  const [friends, setFriends] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [editValues, setEditValues] = useState({
    first_name: "",
    last_name: "",
    login_name: "",
    location: "",
    description: "",
    occupation: "",
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setCurrentUserId(payload.user_id);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const data = await fetchModel("/user/" + userId);
      setUser(data);
      setEditValues({
        first_name: data?.first_name || "",
        last_name: data?.last_name || "",
        login_name: data?.login_name || "",
        location: data?.location || "",
        description: data?.description || "",
        occupation: data?.occupation || "",
      });
    };
    const fetchFriends = async () => {
      if (!ENABLE_FRIEND_FEATURES) return;
      const friendList = await fetchModel(`/user/${userId}/friends`);
      setFriends(friendList || []);
    };
    fetchData();
    fetchFriends();
  }, [userId]);

  if (!user) {
    return <Typography>User not found!</Typography>;
  }

  const refreshUserData = async () => {
    const data = await fetchModel("/user/" + userId);
    setUser(data);
    if (ENABLE_FRIEND_FEATURES) {
      const friendList = await fetchModel(`/user/${userId}/friends`);
      setFriends(friendList || []);
    } else {
      setFriends([]);
    }
    setEditValues({
      first_name: data?.first_name || "",
      last_name: data?.last_name || "",
      login_name: data?.login_name || "",
      location: data?.location || "",
      description: data?.description || "",
      occupation: data?.occupation || "",
    });
  };

  const handleAddFriend = async () => {
    setFriendActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl(`/user/friends/${userId}`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        await refreshUserData();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to add friend");
      }
    } catch (error) {
      console.error("Add friend failed:", error);
      alert("Failed to add friend");
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    setFriendActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl(`/user/friends/${userId}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        await refreshUserData();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to remove friend");
      }
    } catch (error) {
      console.error("Remove friend failed:", error);
      alert("Failed to remove friend");
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleEditChange = (field, value) => {
    setEditValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    setSaveLoading(true);
    setSaveError("");
    setSaveSuccess("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(apiUrl(`/user/${userId}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editValues),
      });

      const data = await response.json();

      if (response.status === 200) {
        setUser(data.user || data);
        setSaveSuccess("Profile updated successfully.");
      } else {
        setSaveError(data.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Profile update failed:", error);
      setSaveError("Failed to update profile");
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <Paper style={{ padding: 16 }}>
      <Typography variant="h4">
        {user.first_name} {user.last_name}
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        {user.photo_count || 0} photos ƒ?›{" "}
        <Link to={`/commentsOf/${user._id}`}>
          {user.comment_count || 0} comments
        </Link>
        {ENABLE_FRIEND_FEATURES && (
          <>
            {"  |  "}
            {user.friend_count || 0} friends
          </>
        )}
      </Typography>
      <Typography variant="body1">
        <strong>Location:</strong> {user.location}
      </Typography>
      <Typography variant="body1">
        <strong>Description:</strong> {user.description}
      </Typography>
      <Typography variant="body1" gutterBottom>
        <strong>Occupation:</strong> {user.occupation}
      </Typography>

      <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
        <Button
          variant="contained"
          color="primary"
          component={Link}
          to={`/photos/${user._id}`}
        >
          View Photos
        </Button>
        {ENABLE_FRIEND_FEATURES &&
          currentUserId &&
          user &&
          user._id &&
          currentUserId !== user._id && (
            <Button
              variant="outlined"
              color={user.is_friend ? "error" : "primary"}
              onClick={user.is_friend ? handleRemoveFriend : handleAddFriend}
              disabled={friendActionLoading}
            >
              {friendActionLoading
                ? "Working..."
                : user.is_friend
                ? "Remove Friend"
                : "Add Friend"}
            </Button>
          )}
      </Box>

      {ENABLE_FRIEND_FEATURES && (
        <>
          <Typography variant="h6" sx={{ mt: 3 }}>
            Friends ({friends.length || 0})
          </Typography>
          {friends.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              No friends yet.
            </Typography>
          ) : (
            <List dense>
              {friends.map((friend) => (
                <React.Fragment key={friend._id}>
                  <ListItem component={Link} to={`/users/${friend._id}`}>
                    <ListItemText
                      primary={`${friend.first_name} ${friend.last_name}`}
                      secondary={`@${friend.login_name}`}
                    />
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>
          )}
        </>
      )}

      {ENABLE_PROFILE_EDIT_FEATURE && currentUserId === userId && (
        <Box mt={4}>
          <Typography variant="h6" gutterBottom>
            Edit Profile
          </Typography>
          <Box
            display="grid"
            gridTemplateColumns="repeat(auto-fit, minmax(240px, 1fr))"
            gap={2}
          >
            <TextField
              label="First Name"
              value={editValues.first_name}
              onChange={(e) => handleEditChange("first_name", e.target.value)}
              required
            />
            <TextField
              label="Last Name"
              value={editValues.last_name}
              onChange={(e) => handleEditChange("last_name", e.target.value)}
              required
            />
            <TextField
              label="Login Name"
              value={editValues.login_name}
              onChange={(e) => handleEditChange("login_name", e.target.value)}
              required
            />
            <TextField
              label="Location"
              value={editValues.location}
              onChange={(e) => handleEditChange("location", e.target.value)}
            />
            <TextField
              label="Occupation"
              value={editValues.occupation}
              onChange={(e) => handleEditChange("occupation", e.target.value)}
            />
            <TextField
              label="Description"
              value={editValues.description}
              onChange={(e) => handleEditChange("description", e.target.value)}
              multiline
              minRows={2}
            />
          </Box>
          <Box mt={2} display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveProfile}
              disabled={saveLoading}
            >
              {saveLoading ? "Saving..." : "Save Changes"}
            </Button>
            {saveError && (
              <Typography color="error" variant="body2">
                {saveError}
              </Typography>
            )}
            {saveSuccess && (
              <Typography color="primary" variant="body2">
                {saveSuccess}
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </Paper>
  );
}

export default UserDetail;
