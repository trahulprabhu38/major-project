package db

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/lib/pq"
)

var Postgres *sql.DB

func ConnectPostgres() {
	dsn := os.Getenv("POSTGRES_DSN")
	if dsn == "" {
		dsn = "postgres://admin:password@localhost:5432/edu?sslmode=disable"
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("Postgres connection error: %v", err)
	}

	if err := db.Ping(); err != nil {
		log.Fatalf("Postgres ping failed: %v", err)
	}

	Postgres = db
	log.Println("Connected to Postgres")
}
