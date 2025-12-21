import React, { useState } from "react";
import { TextField, Button, Typography, Paper, Alert } from "@mui/material";
import { apiUrl } from "../../config.api";

const Login = ({ onLogin }) => {
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");

    if (!loginName || !loginPassword) {
      setLoginError("Please enter both login name and password");
      return;
    }

    try {
      const response = await fetch(apiUrl("/admin/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login_name: loginName,
          password: loginPassword,
        }),
      });

      const data = await response.json();

      if (response.status === 200) {
        localStorage.setItem("token", data.token);
        onLogin(data);
      } else {
        setLoginError(data.error || "Login failed. Please try again.");
      }
    } catch (error) {
      setLoginError("Login failed. Please try again.");
    }
  };
  return (
    <Paper className="login-section" elevation={3}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold", mb: 3 }}>
        Login
      </Typography>
      <form onSubmit={handleLogin}>
        <TextField
          fullWidth
          label="Login Name"
          variant="outlined"
          margin="normal"
          value={loginName}
          onChange={(e) => setLoginName(e.target.value)}
        />
        <TextField
          fullWidth
          label="Password"
          type="password"
          variant="outlined"
          margin="normal"
          value={loginPassword}
          onChange={(e) => setLoginPassword(e.target.value)}
        />
        {loginError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {loginError}
          </Alert>
        )}
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 3, py: 1.5 }}
        >
          Login
        </Button>
      </form>
    </Paper>
  );
};

export default Login;
