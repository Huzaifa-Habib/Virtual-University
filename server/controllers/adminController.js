export const getAdminDashboard = (req, res) => {
  return res.json({
    message: "Admin dashboard data",
    user: req.user,
    stats: { users: 1024, activeCourses: 48, revenue: 12850 }
  });
};
