import React, { useState, useEffect } from "react";
import { Typography, Paper, Button } from "@mui/material";
import { Link, useParams } from "react-router-dom";
import fetchModel from "../../lib/fetchModelData";

import "./styles.css";

/**
 * Define UserDetail, a React component of Project 4.
 */
function UserDetail() {
  const { userId } = useParams();
  const [user, setUser] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      const data = await fetchModel("/user/" + userId);
      setUser(data);
    };
    fetchData();
  }, [userId]);

  if (!user) {
    return <Typography>User not found!</Typography>;
  }

  return (
    <Paper style={{ padding: 16 }}>
      <Typography variant="h4">
        {user.first_name} {user.last_name}
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        {user.photo_count || 0} photos •{" "}
        <Link to={`/commentsOf/${user._id}`}>
          {user.comment_count || 0} comments
        </Link>
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

      <Button
        variant="contained"
        color="primary"
        component={Link}
        to={`/photos/${user._id}`}
      >
        View Photos
      </Button>
    </Paper>
  );
}

export default UserDetail;
