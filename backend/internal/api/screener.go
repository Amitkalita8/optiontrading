package api

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"unicode/utf8"

	"optiontrading/backend/internal/insights"
	"optiontrading/backend/internal/quotes"
)

type askRequest struct {
	Symbol   string `json:"symbol"`
	Question string `json:"question"`
}

// askScreener rates a stock for option sellers (good / medium / poor) with
// Groq, from live quote data. Body: {"symbol":"AAPL","question":"optional"}.
func (a *API) askScreener(w http.ResponseWriter, r *http.Request) {
	var in askRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes)).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	sym, err := quotes.NormalizeSymbol(in.Symbol)
	if err != nil {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{
			"error": "enter a valid ticker", "fields": map[string]string{"symbol": "Enter a ticker such as AAPL"},
		})
		return
	}
	if utf8.RuneCountInString(in.Question) > insights.MaxQuestionLen {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{
			"error": "question is too long", "fields": map[string]string{"question": "Keep it under 300 characters"},
		})
		return
	}

	res, err := a.insights.Analyze(r.Context(), sym, in.Question)
	switch {
	case err == nil:
		writeJSON(w, http.StatusOK, res)
	case errors.Is(err, insights.ErrNotConfigured):
		writeError(w, http.StatusServiceUnavailable, err.Error())
	case errors.Is(err, quotes.ErrNotFound):
		writeError(w, http.StatusNotFound, "no market data for "+sym)
	case errors.Is(err, insights.ErrRateLimited):
		writeError(w, http.StatusTooManyRequests, "The AI is busy right now. Try again in a minute.")
	default:
		log.Printf("screener %s: %v", sym, err)
		writeError(w, http.StatusBadGateway, "The AI screener couldn't answer right now. Try again.")
	}
}
