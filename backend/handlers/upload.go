package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gocql/gocql"
	"github.com/google/uuid"

	"edu-mvp/db"
)

type UploadReq struct {
	Filename string `json:"filename"`
	CsvText  string `json:"csv_text"`
}

func UploadCSVStub(c *gin.Context) {
	// token middleware must have set userID in context, for MVP we'll skip strict checks
	var req UploadReq
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	// In real flow, get faculty id from token
	facultyID := gocql.TimeUUID()

	uploadID := uuid.New()
	if err := db.Session.Query(`INSERT INTO faculty_uploads (upload_id, faculty_id, filename, upload_ts, file_data) VALUES (?,?,?,?,?)`,
		uploadID, facultyID, req.Filename, time.Now(), req.CsvText).Exec(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error: " + err.Error()})
		return
	}
	c.JSON(200, gin.H{"upload_id": uploadID.String()})
}
