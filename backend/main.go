package main

import (
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"edu-mvp/db"
	"edu-mvp/handlers"
	"edu-mvp/utils"
)

func main() {
	// === Load environment variables ===
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "defaultsecret" // fallback for dev
	}
	utils.JwtSecret = []byte(jwtSecret)

	// === Ensure Scylla schema ===
	if err := db.EnsureSchema(); err != nil {
		log.Fatalf("❌ Schema initialization failed: %v", err)
	}

	// === Connect to Scylla ===
	scyllaHost := os.Getenv("SCYLLA_HOST")
	if scyllaHost == "" {
		scyllaHost = "127.0.0.1" // local dev fallback
	}
	db.ConnectScylla([]string{scyllaHost})

	log.Println("✅ ScyllaDB connected successfully")

	// === Initialize Gin router ===
	r := gin.Default()

	// === Enable CORS for React frontend ===
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"}, // frontend
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// === Register API routes ===
	api := r.Group("/")
	{
		api.POST("/signup", handlers.Signup)
		api.POST("/login", handlers.Login)
		api.POST("/upload-stub", handlers.UploadCSVStub)
	}

	// === Start server ===
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Server starting on port %s...", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("❌ Failed to start server: %v", err)
	}
}
