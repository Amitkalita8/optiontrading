// Package mailer sends transactional email (password-reset codes).
package mailer

import (
	"fmt"
	"log"
	"net/smtp"
	"strings"
)

// Mailer delivers a plain-text message.
type Mailer interface {
	Send(to, subject, body string) error
}

// SMTP sends through an SMTP server with PLAIN auth (STARTTLS on 587).
type SMTP struct {
	Host, Port, User, Pass, From string
}

func (m SMTP) Send(to, subject, body string) error {
	from := m.From
	if from == "" {
		from = m.User
	}
	msg := strings.Join([]string{
		"From: Option Seller <" + from + ">",
		"To: " + to,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"",
		body,
	}, "\r\n")
	var auth smtp.Auth
	if m.User != "" {
		auth = smtp.PlainAuth("", m.User, m.Pass, m.Host)
	}
	if err := smtp.SendMail(m.Host+":"+m.Port, auth, from, []string{to}, []byte(msg)); err != nil {
		return fmt.Errorf("smtp send: %w", err)
	}
	return nil
}

// Log writes messages to the server log, for development without SMTP.
type Log struct{}

func (Log) Send(to, subject, body string) error {
	log.Printf("EMAIL (no SMTP configured) to=%s subject=%q\n%s", to, subject, body)
	return nil
}

// New returns SMTP when a host is configured, otherwise Log.
func New(host, port, user, pass, from string) Mailer {
	if host == "" {
		return Log{}
	}
	return SMTP{Host: host, Port: port, User: user, Pass: pass, From: from}
}
