package models

import (
	"github.com/gocql/gocql"
	"time"
)

// User represents a faculty or student account in ScyllaDB.
type User struct {
	UserID       gocql.UUID `json:"user_id"`
	Email        string     `json:"email"`
	PasswordHash string     `json:"password_hash"`
	Name         string     `json:"name"`
	Role         string     `json:"role"` // "faculty" or "student"
	CreatedAt    time.Time  `json:"created_at"`
}
