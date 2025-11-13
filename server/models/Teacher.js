import { db } from "../config/db.js";

export const getAllTeachers = (callback) => {
  const sql = "SELECT t.id, u.name, t.bio, t.expertise_tags FROM teachers t JOIN users u ON t.user_id = u.id WHERE t.verification_status='approved'";
  db.query(sql, callback);
};
