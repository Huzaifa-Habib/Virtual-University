// authMiddleware.js
import jwt from "jsonwebtoken";
import { db } from "../config/db.js";

export const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Token invalid" });

    // Attach user info from token
    req.user = {
      id: decoded.id,
      role: decoded.role
    };

    next();
  });
};
