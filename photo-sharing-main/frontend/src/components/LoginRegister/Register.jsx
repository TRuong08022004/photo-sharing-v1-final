import React, { useState } from "react";
import { TextField, Button, Typography, Paper, Alert } from "@mui/material";
import { apiUrl } from "../../config.api";

const Register = () => {
  const [regLoginName, setRegLoginName] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regLocation, setRegLocation] = useState("");
  const [regDescription, setRegDescription] = useState("");
  const [regOccupation, setRegOccupation] = useState("");
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError("");
    setRegSuccess("");

    // Validation
    if (!regLoginName || !regPassword || !regFirstName || !regLastName) {
      setRegError(
        "Login name, password, first name, and last name are required"
      );
      return;
    }

    if (regPassword !== regPasswordConfirm) {
      setRegError("Passwords do not match");
      return;
    }

    try {
      const response = await fetch(apiUrl("/user"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login_name: regLoginName,
          password: regPassword,
          first_name: regFirstName,
          last_name: regLastName,
          location: regLocation,
          description: regDescription,
          occupation: regOccupation,
        }),
      });

      const data = await response.json();

      if (response.status === 200) {
        setRegSuccess(
          `User ${regLoginName} registered successfully! You can now login.`
        );
        setRegLoginName("");
        setRegPassword("");
        setRegPasswordConfirm("");
        setRegFirstName("");
        setRegLastName("");
        setRegLocation("");
        setRegDescription("");
        setRegOccupation("");
      } else {
        setRegError(data.error || "Registration failed. Please try again.");
      }
    } catch (error) {
      setRegError("Registration failed. Please try again.");
    }
  };
  return (
    <Paper className="register-section" elevation={3}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold", mb: 3 }}>
        Register New Account
      </Typography>
      <form onSubmit={handleRegister}>
        <TextField
          fullWidth
          label="Login Name"
          variant="outlined"
          margin="normal"
          required
          value={regLoginName}
          onChange={(e) => setRegLoginName(e.target.value)}
        />
        <TextField
          fullWidth
          label="Password"
          type="password"
          variant="outlined"
          margin="normal"
          required
          value={regPassword}
          onChange={(e) => setRegPassword(e.target.value)}
        />
        <TextField
          fullWidth
          label="Confirm Password"
          type="password"
          variant="outlined"
          margin="normal"
          required
          value={regPasswordConfirm}
          onChange={(e) => setRegPasswordConfirm(e.target.value)}
        />
        <TextField
          fullWidth
          label="First Name"
          variant="outlined"
          margin="normal"
          required
          value={regFirstName}
          onChange={(e) => setRegFirstName(e.target.value)}
        />
        <TextField
          fullWidth
          label="Last Name"
          variant="outlined"
          margin="normal"
          required
          value={regLastName}
          onChange={(e) => setRegLastName(e.target.value)}
        />
        <TextField
          fullWidth
          label="Location"
          variant="outlined"
          margin="normal"
          value={regLocation}
          onChange={(e) => setRegLocation(e.target.value)}
        />
        <TextField
          fullWidth
          label="Description"
          variant="outlined"
          margin="normal"
          multiline
          rows={3}
          value={regDescription}
          onChange={(e) => setRegDescription(e.target.value)}
        />
        <TextField
          fullWidth
          label="Occupation"
          variant="outlined"
          margin="normal"
          value={regOccupation}
          onChange={(e) => setRegOccupation(e.target.value)}
        />
        {regError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {regError}
          </Alert>
        )}
        {regSuccess && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {regSuccess}
          </Alert>
        )}
        <Button
          type="submit"
          variant="contained"
          color="secondary"
          fullWidth
          sx={{ mt: 3, py: 1.5 }}
        >
          Register Me
        </Button>
      </form>
    </Paper>
  );
};

export default Register;
