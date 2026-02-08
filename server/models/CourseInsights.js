export const createCourseInsightsTable = (db) => {
  const sql = `
    CREATE TABLE IF NOT EXISTS course_insights (
      course_id INT PRIMARY KEY,
      career_outlook TEXT,
      market_demand_score INT,
      salary_range_min INT,
      salary_range_max INT,
      recommended_for TEXT,
      prerequisites TEXT,
      min_price DECIMAL(10,2),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;

  db.query(sql, (err) => {
    if (err) {
      console.log("Error creating course_insights table:", err);
      return;
    }

    console.log("✅ course_insights table ready");

    const seedSql = `
      INSERT INTO course_insights
        (course_id, career_outlook, market_demand_score, salary_range_min, salary_range_max, recommended_for, prerequisites, min_price)
      VALUES
        (1, 'High growth in data-driven roles across industries.', 9, 65000, 140000, 'data-analyst,career-switcher,upskilling', 'Basic statistics; spreadsheet familiarity.', 49.00),
        (2, 'Strong demand in product-led companies and startups.', 8, 70000, 150000, 'product-manager,business-analyst,founder', 'Customer research fundamentals; communication skills.', 59.00),
        (3, 'Steady demand with rising AI/ML integration needs.', 8, 80000, 160000, 'software-engineer,cs-student,career-switcher', 'Programming basics; problem solving.', 69.00)
      ON DUPLICATE KEY UPDATE
        career_outlook = VALUES(career_outlook),
        market_demand_score = VALUES(market_demand_score),
        salary_range_min = VALUES(salary_range_min),
        salary_range_max = VALUES(salary_range_max),
        recommended_for = VALUES(recommended_for),
        prerequisites = VALUES(prerequisites),
        min_price = VALUES(min_price)
    `;

    db.query(seedSql, (seedErr) => {
      if (seedErr) console.log("Error seeding course_insights:", seedErr);
      else console.log("✅ course_insights seeded");
    });
  });
};