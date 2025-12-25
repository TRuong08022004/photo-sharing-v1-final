import React, { useEffect, useMemo, useState } from "react";
import {
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Box,
} from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import fetchModel from "../../lib/fetchModelData";

import "./styles.css";

const SearchResults = () => {
  const location = useLocation();
  const queryParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const query = queryParams.get("query") || "";

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const runSearch = async () => {
      const trimmed = query.trim();
      if (!trimmed) {
        setResults([]);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const path = `/user/search?q=${encodeURIComponent(trimmed)}`;
        const data = await fetchModel(path);
        setResults(data || []);
      } catch (err) {
        console.error("Search failed:", err);
        setError("Search failed. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    runSearch();
  }, [query]);

  const renderBody = () => {
    if (!query.trim()) {
      return <Typography>Enter a keyword to search users.</Typography>;
    }

    if (loading) {
      return (
        <Box display="flex" justifyContent="center" mt={2}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return <Typography color="error">{error}</Typography>;
    }

    if (!results.length) {
      return <Typography>No users found.</Typography>;
    }

    return (
      <List component="nav">
        {results.map((user) => (
          <React.Fragment key={user._id}>
            <ListItem component={Link} to={`/users/${user._id}`}>
              <ListItemText
                primary={`${user.first_name} ${user.last_name}`}
                secondary={`${user.photo_count || 0} photos · ${
                  user.comment_count || 0
                } comments`}
              />
            </ListItem>
            <Divider />
          </React.Fragment>
        ))}
      </List>
    );
  };

  return (
    <div className="search-results">
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
        mb={2}
      >
        <Typography variant="h5">
          Search results for "{query.trim() || "..."}"
        </Typography>
      </Box>
      {renderBody()}
    </div>
  );
};

export default SearchResults;
