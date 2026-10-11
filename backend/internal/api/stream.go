package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"optiontrading/backend/internal/market"
)

const heartbeatEvery = 15 * time.Second

// stream pushes live quotes and market status as Server-Sent Events:
//
//	event: status   data: market.Status   (on connect and whenever it changes)
//	event: quotes   data: batchResponse   (every StreamIntervalOpen while the
//	                                      market is open, StreamIntervalClosed otherwise)
//
// Quotes come from the shared cache, so many viewers of the same symbols cost
// one upstream request per TTL.
func (a *API) stream(w http.ResponseWriter, r *http.Request) {
	symbols, err := parseSymbols(r.URL.Query().Get("symbols"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	withSeries := r.URL.Query().Get("series") == "1"

	rc := http.NewResponseController(w)
	// Long-lived response: lift the server's write timeout for this request.
	if err := rc.SetWriteDeadline(time.Time{}); err != nil {
		log.Printf("stream: clear write deadline: %v", err)
	}

	h := w.Header()
	h.Set("Content-Type", "text/event-stream")
	// no-transform stops compression middleware (e.g. the React dev proxy) buffering events.
	h.Set("Cache-Control", "no-cache, no-transform")
	h.Set("Connection", "keep-alive")
	h.Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)

	send := func(event string, v any) bool {
		data, err := json.Marshal(v)
		if err != nil {
			log.Printf("stream: marshal %s: %v", event, err)
			return false
		}
		if _, err := fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event, data); err != nil {
			return false
		}
		return rc.Flush() == nil
	}

	// Ask EventSource to wait 5s before reconnecting after a drop.
	fmt.Fprint(w, "retry: 5000\n\n")

	var lastPhase string
	pushStatus := func() market.Status {
		s := market.StatusAt(a.now())
		if s.Phase != lastPhase {
			lastPhase = s.Phase
			send("status", s)
		}
		return s
	}

	status := pushStatus()
	if !send("quotes", a.fetchBatch(r, symbols, withSeries)) {
		return
	}

	heartbeat := time.NewTicker(heartbeatEvery)
	defer heartbeat.Stop()
	next := time.NewTimer(a.interval(status))
	defer next.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case <-heartbeat.C:
			if _, err := fmt.Fprint(w, ": ping\n\n"); err != nil || rc.Flush() != nil {
				return
			}
		case <-next.C:
			status = pushStatus()
			if !send("quotes", a.fetchBatch(r, symbols, withSeries)) {
				return
			}
			next.Reset(a.interval(status))
		}
	}
}

// interval is the push cadence, shortened so a pending open/close is noticed promptly.
func (a *API) interval(s market.Status) time.Duration {
	d := a.cfg.StreamIntervalClosed
	if s.IsOpen {
		d = a.cfg.StreamIntervalOpen
	}
	boundary := s.NextOpen
	if s.IsOpen {
		boundary = s.NextClose
	}
	if until := time.Until(boundary) + time.Second; until > 0 && until < d {
		d = until
	}
	return d
}
