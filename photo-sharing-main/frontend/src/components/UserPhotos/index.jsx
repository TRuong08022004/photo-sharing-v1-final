import React, { useState, useEffect } from "react";
import {
  Typography,
  Card,
  CardMedia,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Divider,
  TextField,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useParams, Link } from "react-router-dom";
import fetchModel from "../../lib/fetchModelData";
import { apiUrl, serverUrl } from "../../config.api";

import "./styles.css";

function UserPhotos({ photoUploadTrigger }) {
  const { userId } = useParams();
  const [photos, setPhotos] = useState([]);
  const [commentTexts, setCommentTexts] = useState({});
  const [editingComment, setEditingComment] = useState(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [viewingPhoto, setViewingPhoto] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setCurrentUserId(payload.user_id);
    }
  }, []);

  const fetchPhotos = async () => {
    const data = await fetchModel("/photo/user/" + userId);
    setPhotos(data);
  };

  useEffect(() => {
    fetchPhotos();
  }, [userId, photoUploadTrigger]);

  const handleCommentChange = (photoId, text) => {
    setCommentTexts({
      ...commentTexts,
      [photoId]: text,
    });
  };

  const handleCommentSubmit = async (photoId) => {
    const commentText = commentTexts[photoId];
    if (!commentText || commentText.trim() === "") {
      alert("Comment cannot be empty");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        apiUrl(`/photo/commentsOfPhoto/${photoId}`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ comment: commentText }),
        }
      );

      if (response.status === 200) {
        setCommentTexts({
          ...commentTexts,
          [photoId]: "",
        });
        fetchPhotos();
      } else {
        alert("Failed to add comment");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("Failed to add comment");
    }
  };

  const handleDeleteComment = async (photoId, commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        apiUrl(`/photo/commentsOfPhoto/${photoId}/${commentId}`),
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        fetchPhotos();
      } else {
        alert("Failed to delete comment");
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("Failed to delete comment");
    }
  };

  const handleEditComment = (comment) => {
    setEditingComment(comment);
    setEditCommentText(comment.comment);
  };

  const handleUpdateComment = async (photoId) => {
    if (!editCommentText || editCommentText.trim() === "") {
      alert("Comment cannot be empty");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        apiUrl(`/photo/commentsOfPhoto/${photoId}/${editingComment._id}`),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ comment: editCommentText }),
        }
      );

      if (response.status === 200) {
        setEditingComment(null);
        setEditCommentText("");
        fetchPhotos();
      } else {
        alert("Failed to update comment");
      }
    } catch (error) {
      console.error("Error updating comment:", error);
      alert("Failed to update comment");
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm("Are you sure you want to delete this photo?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        apiUrl(`/photo/${photoId}`),
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        fetchPhotos();
      } else {
        alert("Failed to delete photo");
      }
    } catch (error) {
      console.error("Error deleting photo:", error);
      alert("Failed to delete photo");
    }
  };

  return (
    <div>
      {photos.map((photo) => (
        <Card key={photo._id} style={{ marginBottom: "20px" }}>
          <CardMedia
            src={serverUrl(`/images/${photo.file_name}`)}
            component="img"
            height="400"
            alt={`Photo ${photo._id}`}
            style={{ cursor: "pointer" }}
            onClick={() => setViewingPhoto(photo)}
          />
          <CardContent>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="caption" display="block" gutterBottom>
                Posted on: {new Date(photo.date_time).toLocaleString()}
              </Typography>
              {photo.user_id === currentUserId && (
                <Button
                  color="error"
                  size="small"
                  onClick={() => handleDeletePhoto(photo._id)}
                >
                  Delete Photo
                </Button>
              )}
            </Box>

            <Typography variant="h6">Comments:</Typography>
            <List dense>
              {photo.comments?.map((comment) => (
                <React.Fragment key={comment._id}>
                  <ListItem alignItems="flex-start">
                    <ListItemText
                      primary={comment.comment}
                      secondary={
                        <>
                          <Typography
                            component={Link}
                            to={`/users/${comment.user._id}`}
                            color="primary"
                            style={{ textDecoration: "none" }}
                          >
                            {`${comment.user.first_name} ${comment.user.last_name}`}
                          </Typography>
                          {` - ${new Date(comment.date_time).toLocaleString()}`}
                        </>
                      }
                    />
                    {comment.user._id === currentUserId && (
                      <Box>
                        <Button
                          size="small"
                          onClick={() => handleEditComment(comment)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() =>
                            handleDeleteComment(photo._id, comment._id)
                          }
                        >
                          Delete
                        </Button>
                      </Box>
                    )}
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>

            <Box mt={2}>
              <Typography variant="subtitle2" gutterBottom>
                Add a comment:
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                placeholder="Write a comment..."
                value={commentTexts[photo._id] || ""}
                onChange={(e) => handleCommentChange(photo._id, e.target.value)}
                multiline
                rows={2}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={() => handleCommentSubmit(photo._id)}
                style={{ marginTop: "10px" }}
              >
                Post Comment
              </Button>
            </Box>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!editingComment} onClose={() => setEditingComment(null)}>
        <DialogTitle>Edit Comment</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={editCommentText}
            onChange={(e) => setEditCommentText(e.target.value)}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingComment(null)}>Cancel</Button>
          <Button
            onClick={() => {
              const photoId = photos.find((p) =>
                p.comments.some((c) => c._id === editingComment._id)
              )?._id;
              if (photoId) handleUpdateComment(photoId);
            }}
            variant="contained"
            color="primary"
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!viewingPhoto}
        onClose={() => setViewingPhoto(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent style={{ padding: 0 }}>
          {viewingPhoto && (
            <img
              src={serverUrl(`/images/${viewingPhoto.file_name}`)}
              alt="Full size"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewingPhoto(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default UserPhotos;
