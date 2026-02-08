import { db } from "../config/db.js";
import { promisify } from "util";

const query = promisify(db.query).bind(db);

/**
 * Flexible chatbot service that adapts to your actual database structure
 */

// Query classification patterns
const queryPatterns = {
  course: /course|program|class|learn|study|training/i,
  mentor: /mentor|teacher|instructor|tutor|coach/i,
  pricing: /price|cost|fee|budget|cheap|expensive|afford/i,
  career: /career|job|salary|employment|future|demand|outlook/i,
  recommendation: /recommend|suggest|best|top|good/i,
  aiml: /ai|ml|machine learning|artificial intelligence|data science/i,
  tech: /tech|technology|programming|software|development/i,
  budget: /\$\d+|under \d+|less than \d+|budget/i,
};

/**
 * Classify the user's query intent
 */
function classifyQuery(prompt) {
  const lowercasePrompt = prompt.toLowerCase();
  const intents = [];

  if (queryPatterns.course.test(lowercasePrompt)) intents.push("course");
  if (queryPatterns.mentor.test(lowercasePrompt)) intents.push("mentor");
  if (queryPatterns.pricing.test(lowercasePrompt)) intents.push("pricing");
  if (queryPatterns.career.test(lowercasePrompt)) intents.push("career");
  if (queryPatterns.recommendation.test(lowercasePrompt)) intents.push("recommendation");
  if (queryPatterns.aiml.test(lowercasePrompt)) intents.push("aiml");
  if (queryPatterns.tech.test(lowercasePrompt)) intents.push("tech");

  // Extract budget if mentioned
  const budgetMatch = lowercasePrompt.match(/\$?(\d+)/);
  const budget = budgetMatch ? parseInt(budgetMatch[1]) : null;

  return { intents, budget, originalPrompt: prompt };
}

/**
 * Flexible fetch - tries different column name variations
 */
async function getAllCourses() {
  // Try different common column name patterns
  const queries = [
    // Pattern 1: Standard naming with course_id
    `SELECT 
      course_id as id,
      course_name as name,
      category,
      description,
      price
    FROM courses
    LIMIT 100`,
    
    // Pattern 2: Just 'id' instead of 'course_id'
    `SELECT 
      id,
      course_name as name,
      category,
      description,
      price
    FROM courses
    LIMIT 100`,
    
    // Pattern 3: 'name' instead of 'course_name'
    `SELECT 
      id,
      name,
      category,
      description,
      price
    FROM courses
    LIMIT 100`,
    
    // Pattern 4: 'title' instead of 'course_name'
    `SELECT 
      id,
      title as name,
      category,
      description,
      price
    FROM courses
    LIMIT 100`,
  ];

  for (const sql of queries) {
    try {
      const courses = await query(sql);
      console.log(`✅ Fetched ${courses.length} courses`);
      return courses || [];
    } catch (error) {
      // Try next pattern
      continue;
    }
  }
  
  console.error("❌ Could not fetch courses with any column pattern");
  return [];
}

/**
 * Flexible mentor fetch
 */
async function getAllMentors() {
  const queries = [
    // Pattern 1: Standard with user_id
    `SELECT 
      user_id as id,
      username as name,
      email,
      specialization,
      bio,
      hourly_rate,
      rating,
      total_reviews
    FROM users
    WHERE role = 'teacher'
    ORDER BY rating DESC
    LIMIT 100`,
    
    // Pattern 2: Just 'id'
    `SELECT 
      id,
      username as name,
      email,
      specialization,
      bio,
      hourly_rate,
      rating,
      total_reviews
    FROM users
    WHERE role = 'teacher'
    ORDER BY rating DESC
    LIMIT 100`,
    
    // Pattern 3: 'name' instead of 'username'
    `SELECT 
      id,
      name,
      email,
      specialization,
      bio,
      hourly_rate,
      rating,
      total_reviews
    FROM users
    WHERE role = 'teacher'
    ORDER BY rating DESC
    LIMIT 100`,

    // Pattern 4: Without rating/reviews (for basic tables)
    `SELECT 
      id,
      username as name,
      email,
      specialization,
      bio,
      hourly_rate,
      0 as rating,
      0 as total_reviews
    FROM users
    WHERE role = 'teacher'
    LIMIT 100`,

    // Pattern 5: Most basic - just id and name
    `SELECT 
      id,
      username as name,
      email,
      '' as specialization,
      '' as bio,
      0 as hourly_rate,
      0 as rating,
      0 as total_reviews
    FROM users
    WHERE role = 'teacher'
    LIMIT 100`,
  ];

  for (const sql of queries) {
    try {
      const mentors = await query(sql);
      console.log(`✅ Fetched ${mentors.length} mentors`);
      return mentors || [];
    } catch (error) {
      continue;
    }
  }
  
  console.error("❌ Could not fetch mentors with any column pattern");
  return [];
}

/**
 * Filter courses based on query parameters
 */
function filterCourses(courses, { intents, budget }) {
  let filtered = [...courses];

  // Filter by budget
  if (budget && filtered.length > 0) {
    filtered = filtered.filter(c => {
      const coursePrice = c.price || 0;
      return coursePrice <= budget;
    });
  }

  // Filter by AI/ML focus
  if (intents.includes("aiml") && filtered.length > 0) {
    filtered = filtered.filter(c => {
      const searchText = `${c.name || ''} ${c.description || ''} ${c.category || ''}`.toLowerCase();
      return searchText.includes("ai") || 
             searchText.includes("ml") || 
             searchText.includes("machine learning") ||
             searchText.includes("artificial intelligence") ||
             searchText.includes("data science");
    });
  }

  // Filter by tech focus
  if (intents.includes("tech") && !intents.includes("aiml") && filtered.length > 0) {
    filtered = filtered.filter(c => {
      const searchText = `${c.name || ''} ${c.category || ''}`.toLowerCase();
      return searchText.includes("tech") || 
             searchText.includes("programming") ||
             searchText.includes("software") ||
             searchText.includes("development");
    });
  }

  // Sort by price (cheapest first) if we have prices
  if (filtered.length > 0) {
    filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
  }

  return filtered;
}

/**
 * Analyze mentors based on query
 */
function analyzeMentors(mentors, { intents }) {
  if (!mentors || mentors.length === 0) return [];
  
  // Sort by rating and experience
  const sorted = [...mentors].sort((a, b) => {
    const scoreA = (a.rating || 0) * (a.total_reviews || 1);
    const scoreB = (b.rating || 0) * (b.total_reviews || 1);
    return scoreB - scoreA;
  });

  return sorted;
}

/**
 * Generate intelligent response based on analysis
 */
function generateResponse(queryData, courses, mentors) {
  const { intents, budget, originalPrompt } = queryData;
  
  let response = "";
  let recommendedCourses = [];
  let recommendedMentors = [];

  // Check if we have data
  if (!courses || courses.length === 0) {
    return {
      response: `⚠️ I couldn't find any courses in the database.\n\n` +
               `**To fix this:**\n` +
               `1. Make sure you have a 'courses' table in your database\n` +
               `2. Add some courses to the table\n` +
               `3. Run the sample_data.sql file to add test courses\n\n` +
               `**Required columns:** id (or course_id), course_name (or name/title), price, category, description`,
      recommendedCourses: [],
      recommendedMentors: []
    };
  }

  // Course recommendations
  if (intents.includes("course") || intents.includes("recommendation")) {
    const filtered = filterCourses(courses, queryData);
    recommendedCourses = filtered.slice(0, 3);

    if (recommendedCourses.length > 0) {
      response += "📚 **Course Recommendations:**\n\n";
      
      recommendedCourses.forEach((course, idx) => {
        response += `${idx + 1}. **${course.name}**\n`;
        if (course.price) response += `   💰 Price: $${course.price}\n`;
        if (course.category) response += `   📂 Category: ${course.category}\n`;
        if (course.description) {
          const shortDesc = course.description.length > 100 
            ? course.description.substring(0, 100) + "..." 
            : course.description;
          response += `   📝 ${shortDesc}\n`;
        }
        response += "\n";
      });

      if (budget) {
        response += `✅ All recommendations are within your $${budget} budget.\n\n`;
      }
    } else if (courses.length > 0) {
      response += "I couldn't find courses matching your specific criteria. Here are some available courses:\n\n";
      const topCourses = courses.slice(0, 3);
      topCourses.forEach((course, idx) => {
        response += `${idx + 1}. ${course.name} - $${course.price || "TBD"}\n`;
      });
      response += "\n";
    }
  }

  // Mentor recommendations
  if (intents.includes("mentor") && mentors && mentors.length > 0) {
    const analyzed = analyzeMentors(mentors, queryData);
    recommendedMentors = analyzed.slice(0, 3);

    response += "👨‍🏫 **Recommended Mentors:**\n\n";
    
    recommendedMentors.forEach((mentor, idx) => {
      response += `${idx + 1}. **${mentor.name || mentor.username}**\n`;
      if (mentor.specialization) response += `   🎓 Specialization: ${mentor.specialization}\n`;
      if (mentor.rating && mentor.rating > 0) {
        response += `   ⭐ Rating: ${mentor.rating}/5.0`;
        if (mentor.total_reviews) response += ` (${mentor.total_reviews} reviews)`;
        response += "\n";
      }
      if (mentor.hourly_rate && mentor.hourly_rate > 0) response += `   💰 Rate: $${mentor.hourly_rate}/hour\n`;
      if (mentor.bio) {
        const shortBio = mentor.bio.length > 80 ? mentor.bio.substring(0, 80) + "..." : mentor.bio;
        response += `   📝 ${shortBio}\n`;
      }
      response += "\n";
    });
  } else if (intents.includes("mentor")) {
    response += "👨‍🏫 **Mentors:**\n\n";
    response += "⚠️ I couldn't find any mentors in the database.\n\n";
    response += "To see mentors, make sure you have users with role='teacher' in your database.\n\n";
  }

  // Add helpful closing
  if (response && (recommendedCourses.length > 0 || recommendedMentors.length > 0)) {
    response += "💡 **What else can I help with?**\n";
    response += "• Specific course details\n";
    response += "• Different budget ranges\n";
    response += "• Other subject areas\n";
  } else if (!response || response.trim() === "") {
    response = "👋 Hello! I'm here to help you find courses and mentors.\n\n";
    response += "**Try asking me:**\n";
    response += "• 'Show me beginner courses'\n";
    response += "• 'What courses cost under $100?'\n";
    response += "• 'Find me a programming course'\n";
    response += "• 'Who are the available mentors?'\n";
  }

  return {
    response,
    recommendedCourses: recommendedCourses || [],
    recommendedMentors: recommendedMentors || []
  };
}

/**
 * Main chatbot insights builder
 */
export async function buildChatbotInsights({ prompt }) {
  try {
    console.log(`📝 Processing query: "${prompt}"`);
    
    // Classify the query
    const queryData = classifyQuery(prompt);
    console.log(`🔍 Detected intents:`, queryData.intents);
    if (queryData.budget) console.log(`💰 Budget constraint: $${queryData.budget}`);

    // Fetch data
    const [courses, mentors] = await Promise.all([
      getAllCourses(),
      getAllMentors()
    ]);

    console.log(`📊 Data fetched - Courses: ${courses.length}, Mentors: ${mentors.length}`);

    // Generate intelligent response
    const analysis = generateResponse(queryData, courses, mentors);

    return {
      answer: analysis.response,
      topCourses: analysis.recommendedCourses || [],
      topMentors: analysis.recommendedMentors || [],
      futureScope: "Explore our courses to advance your career!",
      bestPricing: analysis.recommendedCourses && analysis.recommendedCourses.length > 0 
        ? `Best value: ${analysis.recommendedCourses[0]?.name} at $${analysis.recommendedCourses[0]?.price || "TBD"}`
        : "Ask about specific budget ranges!",
      bestMentor: analysis.recommendedMentors && analysis.recommendedMentors.length > 0
        ? analysis.recommendedMentors[0]?.name || "Available mentors ready to help!"
        : "Contact us to learn about our mentors!"
    };
  } catch (error) {
    console.error("❌ Error in buildChatbotInsights:", error);
    return {
      answer: `I'm sorry, I encountered an error: ${error.message}\n\nPlease check:\n1. Database connection is working\n2. Tables exist (courses, users)\n3. Tables have data\n\nRun discover-tables.js to see your table structure.`,
      topCourses: [],
      topMentors: [],
      futureScope: "Unable to fetch data.",
      bestPricing: "Unable to fetch pricing.",
      bestMentor: "Unable to fetch mentors."
    };
  }
}

/**
 * Rank mentors by tags and expertise
 */
export async function rankMentors({ queryTags = [], limit = 10 }) {
  try {
    const mentors = await getAllMentors();
    
    if (!mentors || mentors.length === 0) {
      return [];
    }
    
    // Score mentors based on tags and performance
    const scored = mentors.map(mentor => {
      let score = 0;
      
      // Rating weight
      score += (mentor.rating || 0) * 20;
      
      // Review count weight
      score += Math.min((mentor.total_reviews || 0) * 2, 50);
      
      // Tag matching
      if (queryTags.length > 0 && mentor.specialization) {
        const spec = mentor.specialization.toLowerCase();
        queryTags.forEach(tag => {
          if (spec.includes(tag.toLowerCase())) {
            score += 30;
          }
        });
      }
      
      return { ...mentor, matchScore: score };
    });
    
    // Sort by score and return top results
    scored.sort((a, b) => b.matchScore - a.matchScore);
    return scored.slice(0, limit);
  } catch (error) {
    console.error("Error in rankMentors:", error);
    return [];
  }
}