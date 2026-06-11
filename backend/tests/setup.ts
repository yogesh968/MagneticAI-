import "dotenv/config";

process.env.JWT_SECRET = "test_jwt_secret_256bit_for_testing_only";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_256bit_testing";
process.env.MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/ai_support_test";
process.env.GROQ_API_KEY = process.env.GROQ_API_KEY ?? "test_groq_key";
process.env.COHERE_API_KEY = process.env.COHERE_API_KEY ?? "test_cohere_key";
process.env.QDRANT_URL = process.env.QDRANT_URL ?? "http://localhost:6333";
process.env.NODE_ENV = "test";
