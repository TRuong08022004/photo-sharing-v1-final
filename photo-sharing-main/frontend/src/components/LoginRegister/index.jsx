import React, { useState } from "react";
import { Box, Button } from "@mui/material";
import Login from "./Login";
import Register from "./Register";
import "./styles.css";

function LoginRegister({ onLogin }) {
  const [showRegister, setShowRegister] = useState(false);

  return (
    <Box className="login-register-container">
      {!showRegister ? (
        <>
          <Login onLogin={onLogin} />
          <Box sx={{ mt: 4, textAlign: "center" }}>
            <Button variant="outlined" onClick={() => setShowRegister(true)}>
              Create New Account
            </Button>
          </Box>
        </>
      ) : (
        <>
          <Box sx={{ mb: 3, textAlign: "center" }}>
            <Button variant="text" onClick={() => setShowRegister(false)}>
              ← Back to Login
            </Button>
          </Box>
          <Register />
        </>
      )}
    </Box>
  );
}

export default LoginRegister;
