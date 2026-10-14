package insights

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Completer sends a chat prompt and returns the model's reply (GroqClient in
// production, a fake in tests).
type Completer interface {
	Complete(ctx context.Context, system, user string) (string, error)
}

// GroqClient calls Groq's OpenAI-compatible chat completions API.
type GroqClient struct {
	HTTP    *http.Client
	BaseURL string // default https://api.groq.com/openai/v1
	APIKey  string
	Model   string
}

func NewGroqClient(apiKey, model string) *GroqClient {
	return &GroqClient{
		HTTP:    &http.Client{Timeout: 30 * time.Second},
		BaseURL: "https://api.groq.com/openai/v1",
		APIKey:  apiKey,
		Model:   model,
	}
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Model          string            `json:"model"`
	Messages       []chatMessage     `json:"messages"`
	Temperature    float64           `json:"temperature"`
	MaxTokens      int               `json:"max_tokens"`
	ResponseFormat map[string]string `json:"response_format"`
}

type chatResponse struct {
	Choices []struct {
		Message chatMessage `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

// ErrRateLimited is returned when Groq answers 429.
var ErrRateLimited = errors.New("AI provider rate limit reached")

// Complete asks for a JSON object reply.
func (c *GroqClient) Complete(ctx context.Context, system, user string) (string, error) {
	body, err := json.Marshal(chatRequest{
		Model:          c.Model,
		Messages:       []chatMessage{{Role: "system", Content: system}, {Role: "user", Content: user}},
		Temperature:    0.3,
		MaxTokens:      2048, // reasoning models spend part of this thinking
		ResponseFormat: map[string]string{"type": "json_object"},
	})
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.BaseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+c.APIKey)
	req.Header.Set("Content-Type", "application/json")

	res, err := c.HTTP.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return "", err
	}
	if res.StatusCode == http.StatusTooManyRequests {
		return "", ErrRateLimited
	}
	var out chatResponse
	if err := json.Unmarshal(raw, &out); err != nil {
		return "", fmt.Errorf("groq: status %d: decode: %w", res.StatusCode, err)
	}
	if res.StatusCode != http.StatusOK {
		msg := http.StatusText(res.StatusCode)
		if out.Error != nil {
			msg = out.Error.Message
		}
		return "", fmt.Errorf("groq: status %d: %s", res.StatusCode, msg)
	}
	if len(out.Choices) == 0 {
		return "", errors.New("groq: empty response")
	}
	return out.Choices[0].Message.Content, nil
}
