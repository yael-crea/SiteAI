package main

import (
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/getsentry/sentry-go"
	sentryhttp "github.com/getsentry/sentry-go/http"
)

// Error monitoring with Sentry, enabled only when SENTRY_DSN is set.
//
// Nearly every log line of the backend reports an error, so the log output
// is mirrored to Sentry: each line becomes an event, except the
// informational ones below. Events are grouped by the text before " :", so
// one failing call does not open a new issue for every value it logs.
// Panics in HTTP handlers are captured by sentryhttp.

var infoLogPrefixes = []string{
	"Emails de relance envoyés",
	"Attention : fichier .env introuvable",
}

var (
	logTimestampPattern = regexp.MustCompile(`^\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2}(\.\d+)? `)
	emailPattern        = regexp.MustCompile(`[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}`)
)

func initMonitoring() (flush func()) {
	dsn := strings.TrimSpace(os.Getenv("SENTRY_DSN"))
	if dsn == "" {
		return func() {}
	}

	environment := strings.TrimSpace(os.Getenv("SENTRY_ENVIRONMENT"))
	if environment == "" {
		environment = "production"
	}

	if err := sentry.Init(sentry.ClientOptions{
		Dsn:            dsn,
		Environment:    environment,
		Release:        os.Getenv("RAILWAY_GIT_COMMIT_SHA"),
		SendDefaultPII: false,
	}); err != nil {
		log.Println("Sentry non initialisé :", err)
		return func() {}
	}

	log.SetOutput(io.MultiWriter(os.Stderr, sentryLogWriter{}))
	return func() { sentry.Flush(2 * time.Second) }
}

func monitoringStatus() string {
	if strings.TrimSpace(os.Getenv("SENTRY_DSN")) == "" {
		return "désactivé (SENTRY_DSN absente)"
	}
	return "activé"
}

// withMonitoring reports handler panics to Sentry, then re-panics so
// net/http keeps its usual behavior.
func withMonitoring(handler http.Handler) http.Handler {
	return sentryhttp.New(sentryhttp.Options{Repanic: true}).Handle(handler)
}

type sentryLogWriter struct{}

func (sentryLogWriter) Write(p []byte) (int, error) {
	if message, ok := logEventMessage(string(p)); ok {
		event := sentry.NewEvent()
		event.Level = sentry.LevelError
		event.Message = message
		event.Fingerprint = []string{logFingerprint(message)}
		sentry.CaptureEvent(event)
	}
	return len(p), nil
}

// logEventMessage turns a log line into the message sent to Sentry, without
// the date and with e-mail addresses masked; ok is false for the
// informational lines.
func logEventMessage(line string) (string, bool) {
	message := strings.TrimSpace(logTimestampPattern.ReplaceAllString(strings.TrimSpace(line), ""))
	if message == "" {
		return "", false
	}
	for _, prefix := range infoLogPrefixes {
		if strings.HasPrefix(message, prefix) {
			return "", false
		}
	}
	return emailPattern.ReplaceAllString(message, "[email]"), true
}

func logFingerprint(message string) string {
	if index := strings.Index(message, " :"); index > 0 {
		return message[:index]
	}
	if len(message) > 80 {
		return message[:80]
	}
	return message
}
