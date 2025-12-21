import "./App.css";

import React, { useState, useEffect } from "react";
import { Grid, Paper } from "@mui/material";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import { apiUrl } from "./config.api";

import TopBar from "./components/TopBar";
import UserDetail from "./components/UserDetail";
import UserList from "./components/UserList";
import UserPhotos from "./components/UserPhotos";
import LoginRegister from "./components/LoginRegister";
import UserComments from "./components/UserComments";

const App = (props) => {
  const [user, setUser] = useState(null);
  const [photoUploadTrigger, setPhotoUploadTrigger] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetch(apiUrl("/user/list"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => {
          if (response.status === 401) {
            localStorage.removeItem("token");
            setLoading(false);
          } else {
            const payload = JSON.parse(atob(token.split(".")[1]));
            setUser({
              _id: payload.user_id,
              login_name: payload.login_name,
            });
            setLoading(false);
          }
        })
        .catch(() => {
          localStorage.removeItem("token");
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handlePhotoUploaded = () => {
    setPhotoUploadTrigger((prev) => prev + 1);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <div>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TopBar
              user={user}
              onLogout={handleLogout}
              onPhotoUploaded={handlePhotoUploaded}
            />
          </Grid>
          <div className="main-topbar-buffer" />
          {user && (
            <Grid item sm={3}>
              <Paper className="main-grid-item">
                <UserList />
              </Paper>
            </Grid>
          )}
          <Grid item sm={user ? 9 : 12}>
            <Paper
              className="main-grid-item"
              style={
                !user
                  ? {
                      border: "none",
                      boxShadow: "none",
                      background: "transparent",
                    }
                  : {}
              }
            >
              <Routes>
                <Route
                  path="/login-register"
                  element={
                    user ? (
                      <Navigate to={`/users/${user._id}`} replace />
                    ) : (
                      <LoginRegister onLogin={handleLogin} />
                    )
                  }
                />
                <Route
                  path="/users/:userId"
                  element={
                    user ? (
                      <UserDetail />
                    ) : (
                      <Navigate to="/login-register" replace />
                    )
                  }
                />
                <Route
                  path="/photos/:userId"
                  element={
                    user ? (
                      <UserPhotos photoUploadTrigger={photoUploadTrigger} />
                    ) : (
                      <Navigate to="/login-register" replace />
                    )
                  }
                />
                <Route
                  path="/users"
                  element={
                    user ? (
                      <UserList />
                    ) : (
                      <Navigate to="/login-register" replace />
                    )
                  }
                />
                <Route
                  path="/"
                  element={
                    user ? (
                      <Navigate to={`/users/${user._id}`} replace />
                    ) : (
                      <Navigate to="/login-register" replace />
                    )
                  }
                />
                <Route
                  path="/commentsOf/:userId"
                  element={
                    user ? (
                      <UserComments />
                    ) : (
                      <Navigate to="/login-register" replace />
                    )
                  }
                />
                <Route
                  path="*"
                  element={<Navigate to="/login-register" replace />}
                />
              </Routes>
            </Paper>
          </Grid>
        </Grid>
      </div>
    </Router>
  );
};

export default App;
