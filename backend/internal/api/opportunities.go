package api

import (
	"errors"
	"log"
	"net/http"
	"strconv"

	"optiontrading/backend/internal/campaigns"
	"optiontrading/backend/internal/opportunities"
)

// Engine 01 — AI Opportunity Discovery (signed-in user, X-User-Id):
//
//	GET  /api/opportunities?campaignId=7          scan for that (else the active) campaign
//	GET  /api/opportunities/{oppId}               one opportunity from the user's latest scans
//	GET  /api/campaigns/{id}/opportunities        scan for a campaign (cached, rescanned when stale)
//	POST /api/campaigns/{id}/opportunities/refresh  rescan now
//
// Errors: 404 unknown campaign · 422 {code:"no_watchlist"} · 502 data source down.
func (a *API) opportunityRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/opportunities", a.activeOpportunities)
	mux.HandleFunc("GET /api/opportunities/{oppId}", a.getOpportunity)
	mux.HandleFunc("GET /api/campaigns/{id}/opportunities", a.campaignOpportunities)
	mux.HandleFunc("POST /api/campaigns/{id}/opportunities/refresh", a.refreshOpportunities)
}

// Opportunities exposes the engine so main can run its background loop.
func (a *API) Opportunities() *opportunities.Service { return a.opps }

func (a *API) activeOpportunities(w http.ResponseWriter, r *http.Request) {
	ctx, uid := r.Context(), a.userID(r)
	id, _ := strconv.ParseInt(r.URL.Query().Get("campaignId"), 10, 64)
	if id == 0 {
		id, _ = a.campaigns.ActiveID(ctx, uid)
	}
	if id == 0 {
		list, err := a.campaigns.List(ctx, uid)
		if err != nil {
			a.internalError(w, "list campaigns", err)
			return
		}
		if len(list) == 0 {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "Create a campaign to discover opportunities.", "code": "no_campaign"})
			return
		}
		id = list[0].ID
	}
	a.serveScan(w, r, id, r.URL.Query().Get("refresh") == "1")
}

func (a *API) campaignOpportunities(w http.ResponseWriter, r *http.Request) {
	if id, ok := pathInt64(w, r, "id"); ok {
		a.serveScan(w, r, id, r.URL.Query().Get("refresh") == "1")
	}
}

func (a *API) refreshOpportunities(w http.ResponseWriter, r *http.Request) {
	if id, ok := pathInt64(w, r, "id"); ok {
		a.serveScan(w, r, id, true)
	}
}

func (a *API) serveScan(w http.ResponseWriter, r *http.Request, id int64, force bool) {
	scan, err := a.opps.Get(r.Context(), id, a.userID(r), force)
	switch {
	case errors.Is(err, campaigns.ErrNotFound):
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Campaign not found.", "code": "no_campaign"})
	case errors.Is(err, opportunities.ErrNoWatchlist):
		writeJSON(w, http.StatusUnprocessableEntity, map[string]string{
			"error": "Link a watchlist to this campaign so the engine knows which companies to scan.", "code": "no_watchlist"})
	case err != nil:
		log.Printf("opportunities: campaign %d: %v", id, err)
		writeError(w, http.StatusBadGateway, "Live option data is unavailable right now. Try again in a minute.")
	default:
		writeJSON(w, http.StatusOK, scan)
	}
}

func (a *API) getOpportunity(w http.ResponseWriter, r *http.Request) {
	o, scan, ok := a.opps.Find(r.Context(), a.userID(r), r.PathValue("oppId"))
	if !ok {
		writeError(w, http.StatusNotFound, "This opportunity is no longer available. Open the latest list.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"opportunity":  o,
		"campaignId":   scan.CampaignID,
		"campaignName": scan.CampaignName,
		"goal":         scan.Goal,
		"generatedAt":  scan.GeneratedAt,
		"marketPhase":  scan.MarketPhase,
		"total":        len(scan.Opportunities),
	})
}
