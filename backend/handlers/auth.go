package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gocql/gocql"
	"golang.org/x/crypto/bcrypt"

	"edu-mvp/db"
	"edu-mvp/utils"
)

type SignupRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
	Role     string `json:"role"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func Signup(c *gin.Context) {
	var req SignupRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "hash failure"})
		return
	}

	id := gocql.TimeUUID()
	if err := db.Session.Query(`INSERT INTO users (user_id,email,password_hash,name,role,created_at) VALUES (?,?,?,?,?,?)`,
		id, req.Email, string(hash), req.Name, req.Role, time.Now()).Exec(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error: " + err.Error()})
		return
	}

	c.JSON(200, gin.H{"user_id": id.String()})
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	// fetch user
	var userID gocql.UUID
	var passhash string
	var role string
	q := `SELECT user_id, password_hash, role FROM users WHERE email = ? ALLOW FILTERING` // ALLOW FILTERING ok for small MVP
	if err := db.Session.Query(q, req.Email).Consistency(gocql.One).Scan(&userID, &passhash, &role); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(passhash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}
	token, err := utils.GenerateToken(userID.String(), role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "token generation failed"})
		return
	}
	c.JSON(200, gin.H{"token": token})
}
