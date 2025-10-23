package db

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/gocql/gocql"
)

var Session *gocql.Session

// ConnectScylla initializes a connection to the Scylla cluster.
func ConnectScylla(hosts []string) {
	cluster := gocql.NewCluster(hosts...)
	cluster.Keyspace = "eduks"
	cluster.ConnectTimeout = 10 * time.Second
	cluster.Consistency = gocql.Quorum

	session, err := cluster.CreateSession()
	if err != nil {
		log.Fatalf("❌ Scylla connection error: %v", err)
	}
	Session = session
	fmt.Println("✅ Connected to Scylla on", hosts)
}

// EnsureSchema creates the keyspace and base tables if they don't exist.
func EnsureSchema() error {
	// detect host from env (for docker)
	host := os.Getenv("SCYLLA_HOST")
	if host == "" {
		host = "127.0.0.1"
	}

	cluster := gocql.NewCluster(host)
	cluster.ConnectTimeout = 10 * time.Second

	s, err := cluster.CreateSession()
	if err != nil {
		return fmt.Errorf("failed to connect to Scylla during schema creation: %v", err)
	}
	defer s.Close()

	// Create keyspace
	createKeyspace := `
	CREATE KEYSPACE IF NOT EXISTS eduks
	WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '1'};
	`
	if err := s.Query(createKeyspace).Exec(); err != nil {
		return fmt.Errorf("failed to create keyspace: %v", err)
	}
	fmt.Println("✅ Keyspace 'eduks' verified/created")

	// Connect to that keyspace
	cluster.Keyspace = "eduks"
	ksSession, err := cluster.CreateSession()
	if err != nil {
		return fmt.Errorf("failed to connect to keyspace 'eduks': %v", err)
	}
	defer ksSession.Close()

	// Create users table
	usersCQL := `
	CREATE TABLE IF NOT EXISTS users (
		user_id uuid PRIMARY KEY,
		email text,
		password_hash text,
		name text,
		role text,
		created_at timestamp
	);`
	if err := ksSession.Query(usersCQL).Exec(); err != nil {
		return fmt.Errorf("failed to create users table: %v", err)
	}

	// Create faculty uploads table
	uploadsCQL := `
	CREATE TABLE IF NOT EXISTS faculty_uploads (
		upload_id uuid PRIMARY KEY,
		faculty_id uuid,
		filename text,
		upload_ts timestamp,
		file_data text
	);`
	if err := ksSession.Query(uploadsCQL).Exec(); err != nil {
		return fmt.Errorf("failed to create faculty_uploads table: %v", err)
	}

	fmt.Println("✅ Tables verified/created successfully in 'eduks'")
	return nil
}
