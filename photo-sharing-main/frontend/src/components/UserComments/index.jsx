import React from "react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import fetchModel from "../../lib/fetchModelData";

const UserComments = () => {
  const { userId } = useParams();
  const [comments, setComments] = useState([]);
  useEffect(() => {
    const fetchData = async () => {
      const data = await fetchModel("/photo/commentsOf/" + userId);
      console.log(data);

      setComments(data);
    };
    fetchData();
  }, [userId]);

  return (
    <div>
      {comments.map((comment) => (
        <div key={comment._id}>
          <p>{comment.comment}</p>
        </div>
      ))}
    </div>
  );
};

export default UserComments;
